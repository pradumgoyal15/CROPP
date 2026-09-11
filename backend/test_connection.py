from services.database import get_db_connection


connection = get_db_connection()

if connection and connection.is_connected():
    print("SUCCESS: Connected to MySQL database!")

    cursor = connection.cursor()

    cursor.execute("SHOW TABLES")

    tables = cursor.fetchall()

    print("\nTables in database:")

    for table in tables:
        print(table[0])

    cursor.close()
    connection.close()

else:
    print("FAILED: Could not connect to database.")