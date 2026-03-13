# 🌤️ Weather MLOps: Automated Predictive Pipeline

Este proyecto implementa un ciclo de vida completo de operaciones de Machine Learning (MLOps) orquestado por **Apache Airflow**. Automatiza la extracción de datos climáticos históricos mediante APIs REST, los ingiere en una base de datos relacional y entrena dinámicamente un modelo predictivo que registra inferencias diarias.

## 🚀 Arquitectura del Proyecto y Flujo de Datos

El pipeline está diseñado para operar de forma autónoma, re-entrenando el modelo a medida que nuevos datos ingresan al sistema, mitigando el decaimiento del modelo (*Model Drift*).

1. **Ingesta de Datos (ETL):** Un DAG de Airflow (`schedule_interval='0 */4 * * *'`) consulta la API de **Open-Meteo**. Extrae variables meteorológicas históricas (Temperatura, Precipitación, Viento) y ejecuta inserciones masivas (`bulk insert`) en **MySQL** utilizando `MySqlHook`.
2. **Feature Engineering:** Mediante **Pandas**, los datos relacionales se transforman en series temporales utilizables, aplicando la técnica de desplazamiento (`shift(-1)`) para emparejar el clima actual con el *target* (temperatura máxima) del día siguiente.
3. **Entrenamiento Continuo:** Un modelo de regresión de bosques aleatorios (`RandomForestRegressor` de **Scikit-Learn**) se entrena en memoria con los datos más recientes disponibles en la base de datos.
4. **Inferencia y Monitoreo (MLOps):** El modelo emite una predicción para el día siguiente. Esta predicción se almacena en una tabla separada (`weather_predictions`) junto con el Error Absoluto Medio (MAE) del momento del entrenamiento, preparando el terreno para futuras auditorías automatizadas de precisión frente a los datos reales.

## 🛠️ Stack Tecnológico

* **Orquestación:** Apache Airflow (TaskFlow API)
* **Almacenamiento:** MySQL (Relational DB)
* **Transformación de Datos:** Python 3, Pandas
* **Machine Learning:** Scikit-Learn
* **Manejo de Tiempo:** Pendulum (Timezone-aware scheduling)

## ⚙️ Estructura de la Base de Datos

El proyecto utiliza dos tablas principales para separar los datos crudos de las inferencias analíticas:
* `weather_history`: Almacena la verdad absoluta (datos históricos consumidos de la API).
* `weather_predictions`: Almacena los resultados del modelo predictivo para facilitar la trazabilidad y la evaluación de calidad de la IA.

## ▶️ Reproducción Local

1. Instala las dependencias: `pip install apache-airflow-providers-mysql pandas scikit-learn requests pendulum`
2. Ejecuta el script `database_setup.sql` en tu instancia de MySQL.
3. En la UI de Airflow, crea una conexión llamada `mysql_weather_db` hacia tu base de datos.
4. Coloca el archivo `weather_ml_pipeline.py` en tu directorio `dags/` y activa el DAG.