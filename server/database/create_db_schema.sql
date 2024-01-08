-- Drop Schema --
DROP SCHEMA IF EXISTS p CASCADE;

-- Create Schema --
CREATE SCHEMA p;

-- Create Tables --
CREATE TABLE p.consumption (
    id INT PRIMARY KEY NOT NULL,
    start_date TIMESTAMP WITHOUT TIME ZONE,
    end_date TIMESTAMP WITHOUT TIME ZONE,
    duration_days NUMERIC(3, 1),
    device_type VARCHAR(255),
    device_category VARCHAR(255),
    device_name TEXT,
    files_names VARCHAR(255),
    power_max NUMERIC(6, 1)
);

CREATE TABLE p.user (
    username VARCHAR(100) PRIMARY KEY NOT NULL,
    email VARCHAR(100),
    password VARCHAR(100),
	first_name VARCHAR(100),
	last_name VARCHAR(100),
	age VARCHAR(3),
	gender VARCHAR(10),
	country VARCHAR(50),
    visibility VARCHAR(10),
    notifications VARCHAR(3)
);

CREATE TABLE p.device_type (
    type_name VARCHAR(100) PRIMARY KEY NOT NULL,
    device_category VARCHAR(50),
    power_min NUMERIC(6, 1),
    power_max NUMERIC(6, 1),
    power_draw_pattern VARCHAR(50)
);

CREATE TABLE p.device (
    id SERIAL PRIMARY KEY NOT NULL,
    user_username VARCHAR(100) NOT NULL REFERENCES p.user(username) ON DELETE CASCADE,
    device_type VARCHAR(100) NOT NULL REFERENCES p.device_type(type_name),
    device_category VARCHAR(50),
    device_name TEXT,
    energy_alert_threshold NUMERIC(6, 1) DEFAULT 0.0,
    power_alert_threshold NUMERIC(6, 1) DEFAULT 0.0,
    usage_frequency CHAR(1) DEFAULT('N'),
    custom_power_min NUMERIC(6, 1),
    custom_power_max NUMERIC(6, 1)
);

CREATE TABLE p.device_consumption (
    id SERIAL PRIMARY KEY NOT NULL,
    device_id INT NOT NULL REFERENCES p.device(id) ON DELETE CASCADE,
    consumption_id INT NOT NULL REFERENCES p.consumption(id)
);

CREATE TABLE p.power_reading (
    id SERIAL PRIMARY KEY NOT NULL,
    consumption_id INT NOT NULL REFERENCES p.consumption(id),
    reading_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    power NUMERIC(10, 1) NOT NULL
);

CREATE TABLE p.alert (
    id SERIAL PRIMARY KEY NOT NULL,
    username VARCHAR(100) REFERENCES p.user(username) ON DELETE CASCADE,
    device_id INT NULL REFERENCES p.device(id) ON DELETE CASCADE,
    title VARCHAR(100),
    description VARCHAR(512),
    suggestion VARCHAR (512),
    date TIMESTAMP WITHOUT TIME ZONE,
    type CHAR(1),
    read_status CHAR(1)
);

-- Reset Sequences --
ALTER SEQUENCE p.device_id_seq RESTART WITH 1;
ALTER SEQUENCE p.device_consumption_id_seq RESTART WITH 1;
ALTER SEQUENCE p.power_reading_id_seq RESTART WITH 1;
ALTER SEQUENCE p.alert_id_seq RESTART WITH 1;