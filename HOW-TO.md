### how to update development platform

 1. ssh to `go.eaciit.com`, go to dev path

	```bash
	ssh developer@go.eaciit.com -i ~/Downloads/developer.pem
	cd $GOPATH/src/eaciit/gdrj
	```

 2. pull latest changes of master branch, kill previous app, rebuild

	```bash
	git pull origin master
	sudo lsof -i :8030 # then get the pid, example pid is 63651
	sudo kill -9 63651
	./install.sh
	```


### how to update production platform

> ==== NOTE ==== <br /><br />All *.go files inside `$GOPATH/src/eaciit/gdrjprod` use the old import from `github.com/eaciit/gdrj`. So make sure when you are going to update the production platform, update the development platform first.

 1. ssh to `go.eaciit.com`, go to dev path

	```bash
	ssh developer@go.eaciit.com -i ~/Downloads/developer.pem
	cd $GOPATH/src/eaciit/gdrjprod
	```

 2. pull latest changes of master branch, kill previous app, rebuild

	```bash
	# git checkout master # if necessary
	git pull origin master
	```

 3. make changes on file `config/databases.json`

	```json
	    "_id": "db_acl",
	    "data": {
	        "db": "ecgodrej_prod",
	```
	
	```json
	    "_id": "db_godrej",
	    "data": {
	        "db": "ecgodrej_prod",
	```

 4. change the port on file `config/port.json`

	```json
	[{"_id":"port","port":8029}]
	```

 5. kill previous running app, then rebuild and run

	```bash
	sudo lsof -i :8029 # then get the pid, example pid is 63651
	sudo kill -9 63651
	./install.sh
	```
