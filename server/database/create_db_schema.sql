DROP TABLE IF EXISTS p.consumption;
DROP TABLE IF EXISTS p.device;
DROP TABLE IF EXISTS p.user;
DROP TABLE IF EXISTS p.user_consumption;
DROP SCHEMA IF EXISTS p;

CREATE SCHEMA p;

CREATE TABLE p.consumption (
    id INT PRIMARY KEY NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    duration_days NUMERIC(3, 1),
    device_type VARCHAR(255),
    device_category VARCHAR(255),
    device_name TEXT,
    files_names VARCHAR(255),
    total_power NUMERIC(6, 1)
);

CREATE TABLE p.user (
    username VARCHAR(100) PRIMARY KEY NOT NULL,
    email VARCHAR(100),
    password VARCHAR(100),
	first_name VARCHAR(100),
	last_name VARCHAR(100),
	age VARCHAR(100),
	gender VARCHAR(100),
	country VARCHAR(100),
    visibility VARCHAR(100),
    notifications VARCHAR(100)
);

CREATE TABLE p.user_consumption (
    user_username VARCHAR(50) NOT NULL,
    consumption_id INTEGER NOT NULL,
    PRIMARY KEY(user_username, consumption_id)
);

CREATE TABLE p.alert (
    id SERIAL PRIMARY KEY NOT NULL,
    username VARCHAR(100),
    title VARCHAR(100),
    description VARCHAR(250),
    type CHAR(1),
    read_status CHAR(1)
);

CREATE TABLE p.device (
    type SERIAL PRIMARY KEY NOT NULL,
    power_per_second DECIMAL(6,1)
);