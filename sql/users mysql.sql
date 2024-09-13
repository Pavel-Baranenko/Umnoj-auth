-- Удаление
DROP TABLE IF EXISTS users;

-- Создание 
CREATE TABLE users (
    `id` int,
    `first_name` varchar(100),
    `last_name` varchar(100),
    `middlet_name` varchar(100),
    `sex` varchar(1),
    `city` varchar(100),
    `phone` varchar(15),
    `email` varchar(100),
    `pass` varchar(100), 
    `temp_pass` varchar(100), 
    `user_type` varchar(100),
    `watsapp` varchar(50),
    `telegram` varchar(50),
    `viber` varchar(50),
    `zoom` varchar(50),
    `prop_city` varchar(100),
    `prop_offer` varchar(100),
    `prop_type` varchar(100),
    `prop_state` varchar(100),
    `avatar` varchar(100),
    `licenses` varchar(100),
    `video` varchar(100),
    `about` varchar(500),
    `activation_code` varchar(10),
    `role` varchar(10),
    `updated` bigint
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Индексы
ALTER TABLE users
    ADD PRIMARY KEY (id);

-- AUTO_INCREMENT
ALTER TABLE users
    MODIFY id int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;