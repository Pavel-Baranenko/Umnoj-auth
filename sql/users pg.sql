-- Удаление
DROP TABLE IF EXISTS users;

-- Создание 
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name varchar(100),
    last_name varchar(100),
    middle_name varchar(100),
    sex varchar(1),
    city varchar(100),
    phone varchar(15),
    email varchar(100),
    pass varchar(100), 
    temp_pass varchar(100), 
    user_type varchar(100),
    watsapp varchar(50),
    telegram varchar(50),
    viber varchar(50),
    zoom varchar(50),
    prop_city varchar(100),
    prop_offer varchar(100),
    prop_type varchar(100),
    prop_state varchar(100),
    avatar varchar(100),
    licenses varchar(100),
    video varchar(100),
    about varchar(500),
    alert_all boolean,
    alert_request boolean,
    alert_responce boolean,
    alert_contact boolean,
    alert_news boolean,
    alert_by_email boolean,
    alert_by_telergam boolean,
    activation_code varchar(10),
    role varchar(10),
    updated bigint
);

-- Данные 
INSERT INTO users (email, pass, temp_pass, activation_code, role)
    VALUES ('test@mail.ru','$2b$10$8UKMm2ditTjCujqiIXzu8Obd8A5rAPH60ikzFLL2bBZxGyvxvvB1G','$2b$10$8UKMm2ditTjCujqiIXzu8Obd8A5rAPH60ikzFLL2bBZxGyvxvvB1G','active','admin');