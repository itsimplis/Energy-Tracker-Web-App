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
    create_device_type_table(connector)

    if (no_data):
        print("-- Database initialization finished, without loading data!\n")
    else:
        try:
            create_test_user(connector)
            populate_consumption_table('consumption.csv', connector)
            populate_device_table('consumption.csv', connector)
            populate_device_consumption_table('consumption.csv', connector)
            populate_power_reading_table(connector)
            #generate_alert_table(connector, 'athtech')
            update_device_power_limits(connector)
            print("-- Data loaded successfully!")
            print("-- Database initialization finished!\n")
        except Exception as e:
            print(f"Error : {e}")

    # Alter the consumption table to use SERIAL for the id column regardless of data loading
    alter_consumption_table_to_serial(connector)

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

def alter_consumption_table_to_serial(conn):
    try:
        conn.connect()
        conn.execute("CREATE SEQUENCE p.consumption_id_seq;")
        conn.execute("ALTER TABLE p.consumption ALTER COLUMN id SET DEFAULT NEXTVAL('p.consumption_id_seq');")
        conn.execute("SELECT SETVAL('p.consumption_id_seq', COALESCE((SELECT MAX(id) FROM p.consumption), 0) + 1);")
        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error altering consumption table: {e}")
    finally:
        conn.disconnect()

def create_device_type_table(conn):
    try:
        conn.connect()
        print("-- Populating device type table...")
        conn.execute("""
            INSERT INTO p.device_type (type_name, device_category, power_min, power_max, power_draw_pattern) VALUES
            ('Washing Machine', 'Washing', 500, 1000, 'Occasional'),
            ('Internet Router', 'Multimedia', 5, 20, 'Continuous'),
            ('Vacuum Cleaner', 'Other', 500, 2000, 'Rare'),
            ('Dishwasher', 'Kitchen', 1200, 2400, 'Occasional'),
            ('Boiler', 'Other', 4000, 5500, 'Continuous'), -- Electric Water Heater
            ('Air Purifier', 'Other', 25, 100, 'Continuous'), -- Estimated
            ('Sound System', 'Multimedia', 100, 450, 'Occasional'),
            ('3D Printer', 'Other', 100, 800, 'Occasional'), -- Estimated similar to desktop computer
            ('Coffee Maker', 'Kitchen', 600, 1200, 'Occasional'),
            ('Phone Charger', 'Multimedia', 5, 25, 'Continuous'),
            ('Fridge', 'Kitchen', 150, 800, 'Continuous'), -- Modern Fridge
            ('Radiator', 'Other', 750, 1500, 'Continuous'), -- Space Heater
            ('Dehumidifier', 'Other', 200, 800, 'Continuous'),
            ('Microwave Oven', 'Kitchen', 600, 1200, 'Rare'),
            ('Laptop', 'Multimedia', 20, 75, 'Continuous'),
            ('Tv', 'Multimedia', 30, 500, 'Occasional'), -- Range covering different types
            ('Screen', 'Multimedia', 30, 400, 'Continuous'), -- Estimated similar to TV
            ('Solar Panel', 'Other', 0, 0, 'Continuous'), -- Solar panels generate power
            ('Fan', 'Cooling', 10, 175, 'Occasional'), -- Including various types of fans
            ('Air Conditioner', 'Cooling', 900, 6000, 'Occasional'), -- Central AC (40,000 BTU)
            ('Computer', 'Multimedia', 100, 800, 'Continuous'),
            ('Printer', 'Other', 10, 600, 'Rare'), -- Including laser printers
            ('Dryer', 'Washing', 1800, 5400, 'Occasional'), -- Electric Clothes Dryer
            ('Electric Oven', 'Kitchen', 2150, 5000, 'Occasional'),
            ('Toaster', 'Kitchen', 850, 1500, 'Rare'),
            ('Electric Kettle', 'Kitchen', 1000, 1500, 'Rare'),
            ('Blender', 'Kitchen', 300, 1000, 'Rare'),
            ('Hair Dryer', 'Other', 1000, 1875, 'Rare'),
            ('Iron', 'Other', 1000, 2200, 'Occasional'),
            ('Electric Stove', 'Kitchen', 1000, 3000, 'Occasional'),
            ('Freezer', 'Kitchen', 150, 700, 'Continuous'),
            ('Electric Grill', 'Kitchen', 1200, 2000, 'Rare'),
            ('Home Theater System', 'Multimedia', 200, 500, 'Occasional'),
            ('Induction Hob', 'Kitchen', 1400, 1800, 'Occasional'),
            ('Electric Lawn Mower', 'Other', 500, 1500, 'Rare'),
            ('Electric Shaver', 'Other', 15, 20, 'Rare'),
            ('Space Heater', 'Other', 750, 2000, 'Occasional'),
            ('Electric Water Heater (Tankless)', 'Other', 6600, 8800, 'Continuous'),
            ('Humidifier', 'Other', 175, 300, 'Occasional');
            """)
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
                device_type_text = values[4]
                unique_devices.add((device_type_text, device_category, device_name))

            print("-- Populating device table...")
            for device in unique_devices:
                type_name_query = "SELECT p.device_type.type_name, p.device_type.power_min, p.device_type.power_max FROM p.device_type WHERE p.device_type.type_name = %s"
                type_name_results = connector.execute(type_name_query, (device[0],))
                
                 # Initialize default values
                type_name = None
                power_min = None
                power_max = None

                if type_name_results:
                    type_name, power_min, power_max = type_name_results[0]

                insert_query = """
                    INSERT INTO p.device (user_username, device_type, device_category, device_name, custom_power_min, custom_power_max)
                    VALUES (%s, %s, %s, %s, %s, %s);
                    """
                insert_values = ('athtech', type_name, device[1], device[2], power_min, power_max)
                conn.execute(insert_query, insert_values)
        
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

# [RE-SAMPLING] Resample the readings per second to readings per day, due to data size for performance reasons
#-----------------------------------------------------------------------------------------------
def process_csv_file(file_path):
    df = pd.read_csv(file_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)

    # Remove zero values
    #df_non_zero = df[df['power'] != 0]

    # Outlier detection for low outliers only
    #q1 = df_non_zero['power'].quantile(0.25)
    #lower_bound = q1 - 1.5 * (q1 - df_non_zero['power'].quantile(0.05))

    # Filter out low outliers
    #filtered_df = df_non_zero[df_non_zero['power'] >= lower_bound]

    # Resample and calculate the mean
    resampled_df = df.resample('1H').mean().fillna(method='ffill')  # Forward fill for NaN values

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
            max_energy_for_consumption = 0 # Track the total energy consumption
            max_power_for_consumption = 0  # Track the maximum power

            try:
                # Process the CSV file and get aggregated readings
                readings = process_csv_file(data_file_path)             

                # Prepare data for insertion
                insert_data = []
                total_energy = 0

                # Loop through readings
                for reading in readings:
                    timestamp, power = reading[0], reading[1]
                    insert_data.append((consumption_id, timestamp, power))
                    energy = power / 1000  # Convert power to kWh for this reading
                    total_energy += energy
                    max_energy_for_consumption = max(max_energy_for_consumption, total_energy)
                    max_power_for_consumption = max(max_power_for_consumption, power)  # Update max power

                # Batch insert into power_reading table
                query = "INSERT INTO p.power_reading (consumption_id, reading_timestamp, power) VALUES %s"
                with connector.conn.cursor() as cur:
                    extras.execute_values(cur, query, insert_data, page_size=1000)
                connector.commit()

                # Update energy_max and power_max in p.consumption table
                update_query = """
                UPDATE p.consumption SET energy_max = %s, power_max = %s WHERE id = %s
                """
                connector.execute(update_query, (max_energy_for_consumption, max_power_for_consumption, consumption_id))
                connector.commit()

                print(f"---- Inserted hourly power readings and updated max values for consumption ID {consumption_id}")

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
                'suggestion' : 'It is advised to use the ECO mode which will result in lower consumption overall',
                'date': 'NOW()',
                'type': random.choice(['W', 'I']),  
                'read_status': random.choice(['Y', 'N']) 
            }

            conn.execute("""
                INSERT INTO p.alert (username, device_id, title, description, suggestion, date, type, read_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """, (alert_data['username'], alert_data['device_id'], alert_data['title'], 
                  alert_data['description'], alert_data['suggestion'], alert_data['date'], alert_data['type'], 
                  alert_data['read_status']))

        conn.commit()

    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error executing query: {e}")

    finally:
        conn.disconnect()

# [DEVICE] Update device's power limits
#-----------------------------------------------------------------------------------------------
def update_device_power_limits(connector):
    try:
        connector.connect()
        print("-- Updating device power limits...")

        update_query = """
        UPDATE p.device
        SET custom_power_min = 0,
            custom_power_max = (p.consumption.power_max * 1.1)
        FROM p.consumption
        JOIN p.device_consumption
        ON p.consumption.id = p.device_consumption.consumption_id
        WHERE p.device_consumption.device_id = p.device.id;
        """
        connector.execute(update_query)
        connector.commit()

        print("-- Device power limits updated successfully.")

    except psycopg2.Error as e:
        connector.rollback()
        print(f"Error executing update: {e}")
    finally:
        connector.disconnect()

# Call initialization
init(args.no_data)
