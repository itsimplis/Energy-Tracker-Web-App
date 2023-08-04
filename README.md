# AthTech-Msc-Dissertation

Dissertation Project

## Database initiliazation

Make sure 'household_power_consumption.txt' file is present and placed under: `server\database\` folder.  
Run `python -m server.database.init` to create the database schema, and start loading it with data.  
The proccess may take ~ 6 minutes due to data cleaning and proccessing taking place, prior to insertions.

## Python FastAPI server

Run `python -m uvicorn server.min:app --reload` to start the python fastapi server.

## Angular server

Run `cd app` to navigate to the app directory.  
Run `ng serve` for to start the angular server.  
Navigate to `http://localhost:4200/`.