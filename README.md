# AthTech-Msc-Dissertation

Dissertation Project

## Preparation
Install node.js  
Install python.  
Run `npm install -g @angular/cli` to install angular cli.    
Run `pip install uvicorn fastapi pandas psycopg2 PyJWT bcrypt xlsxwriter` to install necessary python modules.  
Run `cd app` to navigate to the app directory.  
Run `npm install @swimlane/ngx-charts d3` to install ngx-charts and D3.  
Run `npm install @types/d3-shape @types/d3-scale @types/d3-selection` to install D3 Typescript definitions.  

## Database initialization

Make sure 'consumption.csv' file is present and placed under: `server\database\` folder.  
Download dataset from: https://www.kaggle.com/datasets/ecoco2/household-appliances-power-consumption?resource=download  
Exctract all .csv files inside `server\database\` folder.  
Create a database with the following configuration:

    host="localhost",
    port=5432,
    database="postgres",
    user="postgres",
    password="password"

* Run `python -m server.database.init` to create the database schema, and start loading it with data from the dataset.  
  ( this process may take ~ 5-10 minutes depending on your machine )  
* Otherwise, run `python -m server.database.init --no-data` to simply create the database schema without pre-loaded data.

## Python FastAPI server

Run `python -m uvicorn server.main:app --reload` to start the python fastapi server.  

## Angular server

Run `cd app` to navigate to the app directory.  
Run `ng serve` for to start the angular server.  
Navigate to `http://localhost:4200/`.
