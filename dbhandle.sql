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
    Read_execution_time FLOAT,
    Write_execution_time FLOAT,
    Api_execution_time FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);