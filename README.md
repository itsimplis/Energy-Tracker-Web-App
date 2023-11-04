# AthTech-Msc-Dissertation

Dissertation Project

## Preparation
Install node.js  
Install python.  
Run `npm install -g @angular/cli` to install angular cli.  
Run `pip install uvicorn fastapi psycopg2 jwt bcrypt` to install necessary python modules.  

## Database initiliazation

Make sure 'consumption.csv' file is present and placed under: `server\database\` folder.  
Create a database named 'postgres'.  
Run `python -m server.database.init` to create the database schema, and start loading it with data.   

## Python FastAPI server

Run `python -m uvicorn server.min:app --reload` to start the python fastapi server.  

## Angular server

Run `cd app` to navigate to the app directory.  
Run `ng serve` for to start the angular server.  
Navigate to `http://localhost:4200/`.
