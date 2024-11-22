import pandas as pd
from sqlalchemy import create_engine

username = "postgres" #default username, change if you changed
password = "iamcharlie" #input password
host = "localhost" #default
port = "5432" #default
# Create a connection to PostgreSQL
engine = create_engine('postgresql://${username}:${password}@${host}:${port}/accidents')

# Process the dataset in chunks
chunk_size = 10000  # Define chunk size
for chunk in pd.read_csv('./Collisions Dataset.csv', chunksize=chunk_size):
    # chunk.columns = [c.lower() for c in chunk.columns]  # Normalize column names
    chunk.to_sql("collisions", engine, if_exists='append', index=False)
    print(f"Chunk of size {len(chunk)} imported.")
print("Import complete.")
