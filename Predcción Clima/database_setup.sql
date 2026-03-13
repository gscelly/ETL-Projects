CREATE DATABASE IF NOT EXISTS weather_ml_db;
USE weather_ml_db;

-- Tabla 1: El libro de texto del modelo (Datos del pasado)
CREATE TABLE IF NOT EXISTS weather_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_date DATE UNIQUE,
    city VARCHAR(50),
    temp_max FLOAT,
    temp_min FLOAT,
    precipitation FLOAT,
    wind_speed FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: El registro de predicciones (Para auditoría de MLOps)
CREATE TABLE IF NOT EXISTS weather_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_for_date DATE UNIQUE, -- La fecha del "mañana" que estamos prediciendo
    city VARCHAR(50),
    predicted_temp_max FLOAT,
    actual_temp_max FLOAT NULL, -- Se llenará en el futuro para comparar
    mae_at_training FLOAT, -- Qué tan preciso era el modelo cuando hizo esta predicción
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);