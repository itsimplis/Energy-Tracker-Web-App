import psycopg2
import os
from ..model.dbconnector import PostgresConnector

# define the connector
connector = PostgresConnector(
    host="localhost",
    port=5432,
    database="postgres",
    user="postgres",
    password="password",
)

# create the schema
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

    connector.disconnect()

# load data into database
def populate_database(data_file, conn):
    try:
        conn.connect()

        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_file_path = os.path.join(current_dir, data_file)

        with open(data_file_path, 'r') as data_file:
            data_file.readline()
            
            lines = data_file.readlines()
            total_lines = len(lines)
            completed_lines = 0

            print("-- Loading data into database...")
            for line in lines:
                values = line.strip().split(';')
                if '?' in values:
                    continue
                conn.execute("""
                    INSERT INTO p.consumption (record_date, record_time, global_active_power, global_reactive_power, voltage, global_intensity, sub_metering_1, sub_metering_2, sub_metering_3)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, values)

                completed_lines += 1
                percentage = (completed_lines / total_lines) * 100
                print(f"-- Progress: {percentage:.2f}%", end='\r')
                if completed_lines == total_lines:
                    print()

            conn.commit()
            print("-- Data loaded successfully!")
            print("-- Database initialization finished!\n")

    except FileNotFoundError:
        print(f"File not found: '{data_file_path}'. Please make sure the file exists in the specified location.")

    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error executing query: {e}")

    finally:
        conn.disconnect()

create_database_schema('create_db_schema.sql', connector)
populate_database('household_power_consumption.txt', connector)
