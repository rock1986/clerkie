1. The node app is callable using “node app.js”
	Dependencies/libraries: MongoDB, Mongoose, Express, Async

2. The API listens to local port 1984 using Express 

3. MongoDB is used to store information: mongodb://localhost:27017/interview_challenge
	Standard Port 27017: localhost:27017
	Database Name: interview_challenge
	Schema (/model): 
	⁃Transaction: Store all standard transactions
	⁃Recurring: Store recurring information: interval between two recurring transactions, amount, last recurring date
	⁃Company: Store all companies appeared in transactions
	⁃RecurringTransaction: Store output format of recurring transactions

4. Route information are speicified in Route module (/route)
	⁃Upsert transactions uses the root POST path 
	⁃Get recurring transactions uses the root GET path 

5. All business logic are implemented in Controller module (/controller)
	⁃RecurringController: 
		1. Update or Insert input transactions. 
		2. Extract companies from the input. 
		3. Group by user_id and company, for each group use existing recurring information or calculate new recurring information to determine recurring transactions. 
		4. Create a new RecurringTransaction Object and add all recurring transactions to it or update existing RecurringTransaction Object for each user_id and company combination. 
		5. Data in RecurringTransaction table is the desired output.

6. The app times out after 10 seconds
