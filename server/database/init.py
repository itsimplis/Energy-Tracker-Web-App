import argparse
import random
import bcrypt
import psycopg2
import os
import pandas as pd
from psycopg2 import extras
from ..model.dbconnector import PostgresConnector

# define the connector
connector = PostgresConnector(
    host="localhost",
    port=5432,
    database="postgres",
    user="postgres",
    password="password",
)

parser = argparse.ArgumentParser(description="Initialize the database with optional data loading.")
parser.add_argument('--no-data', action='store_true', help="Skip loading data into the database.")
args = parser.parse_args()

# Initialization
def init(no_data: bool):

    create_database_schema('create_db_schema.sql', connector)

    if (no_data):
        print("-- Database initialization finished, without loading data!\n")
    else:
        try:
            create_test_user(connector)
            populate_consumption_table('consumption.csv', connector)
            populate_device_table('consumption.csv', connector)
            populate_device_consumption_table('consumption.csv', connector)
            populate_power_reading_table(connector)
            generate_alert_table(connector, 'athtech')
            print("-- Data loaded successfully!")
            print("-- Database initialization finished!\n")
        except Exception as e:
            print(f"Error : {e}")


# [SCHEMA] Create the db schema
def create_database_schema(sql_file, conn):

    current_dir = os.path.dirname(os.path.abspath(__file__))
    sql_file = os.path.join(current_dir, sql_file)

    connector.connect()

    try:
        with open(sql_file, 'r') as f:
            sql_script = f.read()

        connector.execute(sql_script)

        print(f"-- Creating database schema...")
    except psycopg2.Error as e:
        print(f"Error executing SQL script '{sql_file}': {e}")
    finally:
        connector.disconnect()


# [TEST USER] Create a test user
#-----------------------------------------------------------------------------------------------
def create_test_user(conn):
    try:
        conn.connect()
        print("-- Creating test user 'athtech'...")

        hashed_password = bcrypt.hashpw('athtech'.encode(), bcrypt.gensalt())

        # SQL statement to insert a test user
        conn.execute("""
            INSERT INTO p.user (username, email, password, first_name, last_name, age, gender, country, visibility, notifications)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, ('athtech', 'athtech@athtech.gr', hashed_password.decode('utf-8'), 'Test', 'User', '30', 'Other', 'Greece', 'public', 'on'))
        conn.commit()

    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error executing query: {e}")
    finally:
        conn.disconnect()


# [CONSUMPTION] Populate the consumption table (p.consumption)
#-----------------------------------------------------------------------------------------------
def populate_consumption_table(data_file, conn):
    try:
        conn.connect()

        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_file_path = os.path.join(current_dir, data_file)

        with open(data_file_path, 'r') as data_file:
            data_file.readline()
            
            lines = data_file.readlines()
            total_lines = len(lines)
            completed_lines = 0

            print("-- Populating consumption table...")
            for line in lines:
                values = line.strip().split(',')
                if '' in values:
                    continue
                conn.execute("""
                    INSERT INTO p.consumption (id,start_date,end_date,duration_days,device_type,device_category,device_name,files_names,power_max)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, values)

                completed_lines += 1
                percentage = (completed_lines / total_lines) * 100
                print(f"-- Progress: {percentage:.2f}%", end='\r')
                if completed_lines == total_lines:
                    print()

            conn.commit()

    except FileNotFoundError:
        print(f"File not found: '{data_file_path}'. Please make sure the file exists in the specified location.")
    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error executing query: {e}")
    finally:
        conn.disconnect()


# [DEVICES] Populate the devices table (p.device)
#-----------------------------------------------------------------------------------------------
def populate_device_table(data_file, conn):
    try:
        conn.connect()

        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_file_path = os.path.join(current_dir, data_file)

        with open(data_file_path, 'r') as data_file:
            data_file.readline()  # Skip the header line
            
            unique_devices = set()
            for line in data_file:
                values = line.strip().split(',')
                if '' in values:
                    continue
                device_name = values[6]
                device_category = values[5]
                device_type = values[4]
                unique_devices.add((device_type, device_category, device_name))

            print("-- Populating device table...")
            for device in unique_devices:
                conn.execute("""
                    INSERT INTO p.device (user_username, device_type, device_category, device_name)
                    VALUES (%s, %s, %s, %s);
                """, ('athtech', device[0], device[1], device[2]))

            conn.commit()

    except FileNotFoundError:
        print(f"File not found: '{data_file_path}'. Please make sure the file exists in the specified location.")
    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error executing query: {e}")
    finally:
        conn.disconnect()


# [DEVICE - CONSUMPTION] Populate the device-consumption linking table (p.device_consumption)
#-----------------------------------------------------------------------------------------------
def populate_device_consumption_table(data_file, conn):
    try:
        conn.connect()

        # Fetch the device IDs from the database
        device_ids = conn.execute("SELECT id, device_name FROM p.device;")
        device_name_to_id = {name: id for id, name in device_ids}

        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_file_path = os.path.join(current_dir, data_file)

        with open(data_file_path, 'r') as data_file:
            data_file.readline() 
            
            print("-- Populating device consumption table...")
            for line in data_file:
                values = line.strip().split(',')
                if '' in values:
                    continue
                device_name = values[6] 
                consumption_id = values[0]
                device_id = device_name_to_id.get(device_name)
                if device_id:
                    conn.execute("""
                        INSERT INTO p.device_consumption (device_id, consumption_id)
                        VALUES (%s, %s);
                    """, (device_id, consumption_id))

            conn.commit()

    except FileNotFoundError:
        print(f"File not found: '{data_file_path}'. Please make sure the file exists in the specified location.")
    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error executing query: {e}")
    finally:
        conn.disconnect()

# [RE-SAMPLING] Resample the readings per second to readings per minutes, due to data size for performance reasons
#-----------------------------------------------------------------------------------------------
def process_csv_file(file_path):
    df = pd.read_csv(file_path)
    
    # Ensure column names match those in your CSV
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)

    # Resample and sum (or use .mean() for average)
    resampled_df = df.resample('1T').sum() 

    resampled_df.reset_index(inplace=True)
    readings = resampled_df.values.tolist()
    return readings


# [POWER READINGS] Populate the power_reading table from csv files (p.power_reading)
#-----------------------------------------------------------------------------------------------
def populate_power_reading_table(connector):
    try:
        connector.connect()
        current_dir = os.path.dirname(os.path.abspath(__file__))

        # Fetch consumption data with file names
        consumption_data = connector.execute("SELECT id, files_names FROM p.consumption")

        print("-- Populating power_reading table...")

        for consumption_id, file_name in consumption_data:
            if not file_name:
                continue

            data_file_path = os.path.join(current_dir, file_name)
            
            try:
                # Process the CSV file and get aggregated readings
                readings = process_csv_file(data_file_path)

                # Prepare data for insertion
                insert_data = [(consumption_id, reading[0], reading[1]) for reading in readings]

                # Batch insert into power_reading table
                query = "INSERT INTO p.power_reading (consumption_id, reading_timestamp, power) VALUES %s"
                with connector.conn.cursor() as cur:
                    extras.execute_values(cur, query, insert_data, page_size=1000)
                connector.commit()

                print(f"---- Inserted aggregated readings for consumption ID {consumption_id}")

            except FileNotFoundError:
                print(f"File not found: '{data_file_path}'. Skipping.")
                continue
            except psycopg2.Error as e:
                connector.conn.rollback()
                print(f"Error executing query: {e}")

    except psycopg2.Error as e:
        print(f"Database error: {e}")
    finally:
        connector.disconnect()



# [ALERTS] Populate the alert table (p.alert)
#-----------------------------------------------------------------------------------------------
def generate_alert_table(conn, username):
    try:
        conn.connect()
        print("-- Populating alert table...")

        device_ids = conn.execute("SELECT id FROM p.device WHERE user_username = %s;", (username,))

        # Insert an alert for each device
        for device_id in device_ids:
            alert_data = {
                'username': username,
                'device_id': device_id[0],
                'title': 'Test Alert'+str(device_id[0]),
                'description': 'This is a test alert for device '+str(device_id[0]),
                'date': 'NOW()',
                'type': random.choice(['W', 'I']),  
                'read_status': random.choice(['Y', 'N']) 
            }

            conn.execute("""
                INSERT INTO p.alert (username, device_id, title, description, date, type, read_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (alert_data['username'], alert_data['device_id'], alert_data['title'], 
                  alert_data['description'], alert_data['date'], alert_data['type'], 
                  alert_data['read_status']))

        conn.commit()

    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error executing query: {e}")

    finally:
        conn.disconnect()


# Call initialization
init(args.no_data)
