DROP TABLE IF EXISTS p.consumption;
DROP TABLE IF EXISTS p.user;
DROP SCHEMA IF EXISTS p;

CREATE SCHEMA p;

CREATE TABLE p.consumption (
    id SERIAL PRIMARY KEY NOT NULL,
    record_date DATE,
    record_time TIME,
    global_active_power DECIMAL(6, 3),
    global_reactive_power DECIMAL(6, 3),
    voltage DECIMAL(6, 3),
    global_intensity DECIMAL(6, 2),
    sub_metering_1 DECIMAL(6, 3),
    sub_metering_2 DECIMAL(6, 3),
    sub_metering_3 DECIMAL(6, 3)
);

CREATE TABLE p.USER (
    username VARCHAR(100) PRIMARY KEY NOT NULL,
	first_name VARCHAR(100),
	last_name VARCHAR(100),
	age VARCHAR(100),
	gender VARCHAR(100),
	country VARCHAR(100),
    mail_address VARCHAR(100),
    password VARCHAR(100)
);