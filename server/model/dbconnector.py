import psycopg2

class PostgresConnector:
    def __init__(self, host, port, database, user, password):
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.conn = None

    def connect(self):
        try:
            self.conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.user,
                password=self.password,
            )
        except psycopg2.Error as e:
            print("Error connecting to PostgreSQL database:", e)

    def disconnect(self):
        if self.conn is not None:
            self.conn.close()

    def execute(self, query, params=None):
        try:
            cur = self.conn.cursor()
            cur.execute(query, params)
            self.conn.commit()
            if cur.description is not None:
                return cur.fetchall()
            else:
                return None
        except psycopg2.Error as e:
            print("Error executing query:", e)

    def rollback(self):
        self.conn.rollback()
    
    def commit(self):
        self.conn.commit()