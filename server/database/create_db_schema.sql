DROP TABLE IF EXISTS p.consumption;
DROP TABLE IF EXISTS p.device;
DROP TABLE IF EXISTS p.user;
DROP TABLE IF EXISTS p.device_consumption;
DROP TABLE IF EXISTS p.alerts;
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
	age VARCHAR(3),
	gender VARCHAR(10),
	country VARCHAR(50),
    visibility VARCHAR(10),
    notifications VARCHAR(3)
);

CREATE TABLE p.device (
    id SERIAL PRIMARY KEY NOT NULL,
    user_username VARCHAR(100) NOT NULL REFERENCES p.user(username) ON DELETE CASCADE,
    device_type VARCHAR(100),
    device_category VARCHAR(50),
    device_name TEXT
);

CREATE TABLE p.device_consumption (
    id SERIAL PRIMARY KEY NOT NULL,
    device_id INT NOT NULL REFERENCES p.device(id) ON DELETE CASCADE,
    consumption_id INT NOT NULL REFERENCES p.consumption(id)
);

CREATE TABLE p.alert (
    id SERIAL PRIMARY KEY NOT NULL,
    username VARCHAR(100) REFERENCES p.user(username) ON DELETE CASCADE,
    device_id INT NULL REFERENCES p.device(id) ON DELETE CASCADE,
    title VARCHAR(100),
    description VARCHAR(250),
    date TIMESTAMP WITH TIME ZONE,
    type CHAR(1),
    read_status CHAR(1)
);
