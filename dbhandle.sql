SELECT 'CREATE DATABASE interviewdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'interviewdb')\gexec

\c interviewdb;

CREATE TABLE IF NOT EXISTS report (
    id SERIAL PRIMARY KEY,
    api_count INT,
    entries_count INT,
    true_count INT,
    false_count INT,
    pipeline_errors_count INT,
    read_execution_time FLOAT,
    write_execution_time FLOAT,
    api_execution_time FLOAT,
    dateline DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT * FROM report;

SELECT api_count FROM report;

-- SORTING by ascending and descending order the values 

SELECT true_count FROM report ORDER BY true_count ASC;

SELECT true_count FROM report ORDER BY true_count DESC;

SELECT false_count FROM report ORDER BY false_count ASC;

SELECT false_count FROM report ORDER BY false_count DESC;

SELECT read_execution_time, write_execution_time, api_execution_time FROM report; 

SELECT read_execution_time, write_execution_time, api_execution_time FROM report ORDER BY read_execution_time, write_execution_time, api_execution_time;

SELECT read_execution_time, write_execution_time, api_execution_time FROM report ORDER BY read_execution_time, write_execution_time, api_execution_time DESC;

-- WHERE clause 

-- See how many executions of the file we had in one day
SELECT * FROM report WHERE dateline = '2021-07-17';

SELECT * FROM report WHERE dateline >= '2021-07-17';

SELECT true_count FROM report WHERE dateline >= '2021-07-17' ORDER BY true_count;

-- Get read_executions between specific time executions
SELECT * FROM report WHERE read_execution_time >= 100.000;

SELECT * FROM report WHERE read_execution_time >= 100.000 AND read_execution_time <=380.000;

-- SELECT * FROM report WHERE dateline >= '2021-07-17' AND read_execution_time >= 100.000 AND read_execution_time <=380.000;

SELECT * FROM report WHERE dateline >= '2021-07-17' AND read_execution_time BETWEEN 100.000 AND 380.000;

-- Agregation

SELECT AVG(write_execution_time) as avg_write_execution_time, AVG(read_execution_time) as avg_read_execution_time, AVG(api_execution_time) as avg_api_execution_time FROM report;

SELECT AVG(true_count) as avg_true_count, AVG(false_count) as avg_false_count FROM report;

SELECT SUM(write_execution_time + read_execution_time + api_execution_time) as overall_execution_time from report WHERE created_at = '2021-07-17 19:11:33.386246+03';

-- Summary of the execution time for every operation (read, write, api) in ASC order
SELECT * FROM (SELECT SUM(write_execution_time + read_execution_time + api_execution_time)as overall_execution_time FROM report GROUP BY id) as sum_time ORDER BY sum_time; 