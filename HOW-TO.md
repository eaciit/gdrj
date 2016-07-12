### how to update production

 1. create new branch

	```bash
	git branch prodjul12
	git checkout prodjul12
	```

 2. make changes on file `config/databases.json`

	```json
	[{
	    "_id": "db_acl",
	    "data": {
	        "db": "ecgodrej_prod",
	        // ...
	    }
	},
	{
	    "_id": "db_godrej",
	    "data": {
	        "db": "ecgodrej_prod",
	        // ...
	    }
	}]
	```

 3. change the port on file `config/port.json`

	```json
	[{"_id":"port","port":8029}]
	```

 4. make some changes on the installer file, `install.sh`

	```bash
	rm -rf gdrjprod
	go build
	echo '' > log.txt
	sudo ./gdrjprod > log.txt &
	```

 5. ssh to `go.eaciit.com`, go to prod path

	```bash
	ssh developer@go.eaciit.com -i ~/Downloads/developer.pem
	cd $GOPATH/src/eaciit/gdrjprod
	```

 6. kill previous running app

	```bash
	sudo lsof -i :8029 # then get the pid, example pid is 63651
	sudo kill -9 63651
	```

 7. pull the brance, use it, then build

	```bash
	git pull origin prodjul12
	git checkout prodjul12
	./install.sh
	```

 8. check on log

	```bash
	tail -f log.txt
	```
