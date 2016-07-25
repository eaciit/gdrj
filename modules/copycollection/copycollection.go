package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"flag"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

var (
	conn           dbox.IConnection
	tablegroup     string
	tablename      string
	source         string
	dest           string
	tablegrouplist = []string{"allpl", "alloutlet"}
	sourcedest     = []string{"devel", "prod", "ba"}
)

func setinitialconnection() {
	var err error
	conn, err = modules.GetDboxIConnection("db_godrej")

	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}

	err = gdrj.SetDb(conn)
	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}
}

func main() {

	setinitialconnection()
	defer gdrj.CloseDb()

	flag.StringVar(&tablegroup, "tablegroup", "", "group of collection")
	flag.StringVar(&tablename, "tablename", "", "collection name")
	flag.StringVar(&source, "from", "", "source location of dumped collection")
	flag.StringVar(&dest, "to", "", "destination location of restored collection")
	flag.Parse()

	copycollection()
}

func copycollection() {
	conn, _ := modules.GetDboxIConnection("db_godrej")
	defer conn.Close()
	if source == "" || dest == "" {
		errmsg := ""
		if source == "" {
			errmsg = "source location of dumped collection"
		} else {
			errmsg = "destination location of restored collection"
		}
		toolkit.Println("\nPlease fill parameter for", errmsg)
		return
	} else {
		if !toolkit.HasMember(sourcedest, strings.ToLower(source)) {
			toolkit.Println("\nsource location is not valid, choose the valid parameter below :")
			toolkit.Println("ba\tto dump collection from go.eaciit.com:27123/ecgodrej")
			toolkit.Println("devel\tto dump collection from 52.220.25.190:27123/ecgodrej")
			toolkit.Println("prod\tto dump collection from go.eaciit.com:27123/ecgodrej_prod")
			return
		} else if !toolkit.HasMember(sourcedest, strings.ToLower(dest)) {
			toolkit.Println("\ndestination location is not valid")
			toolkit.Println("ba\tto restore collection into go.eaciit.com:27123/ecgodrej")
			toolkit.Println("devel\tto restore collection into 52.220.25.190:27123/ecgodrej")
			toolkit.Println("prod\tto restore collection into go.eaciit.com:27123/ecgodrej_prod")
			return
		}
	}

	if tablegroup == "" && tablename == "" {
		toolkit.Println("\nPlease fill parameter for tablegroup or tablename")
		return
	} else if tablegroup != "" {
		if !toolkit.HasMember(tablegrouplist, strings.ToLower(tablegroup)) {
			toolkit.Println("\ntablegroup is not valid, choose the valid parameter below :")
			toolkit.Println("allpl\t\tto dump-restore all pl collection")
			toolkit.Println("alloutlet\tto dump-restore all outlet collection")
			toolkit.Println("all\t\tto dump-restore both all pl collection and all outlet collection")
			return
		}
	}

	tablelist := conn.ObjectNames(dbox.ObjTypeTable)
	errmsg := ""

	listofcol := []string{}
	if tablename != "" {
		_tablelist := []string{}
		for _, col := range tablelist {
			_tablelist = append(_tablelist, strings.ToLower(col))
		}
		if !toolkit.HasMember(_tablelist, strings.ToLower(tablename)) {
			errmsg = toolkit.Sprintf("\n%s/%s doesn't have collection %s", conn.Info().Host,
				conn.Info().Database, tablename)
		} else {
			listofcol = append(listofcol, tablename)
		}
	}

	if tablegroup != "" {
		switch tablegroup {
		case "allpl":
			for _, col := range tablelist {
				if strings.HasPrefix(col, "pl_") {
					listofcol = append(listofcol, col)
				}
			}
		case "alloutlet":
			for _, col := range tablelist {
				if strings.HasPrefix(col, "outlet_number_") {
					listofcol = append(listofcol, col)
				}
			}
		case "all":
			for _, col := range tablelist {
				if strings.HasPrefix(col, "pl_") || strings.HasPrefix(col, "outlet_number_") {
					listofcol = append(listofcol, col)
				}
			}
		}
	}

	hostsource := ""
	dbsource := ""
	hostdest := ""
	dbdest := ""

	switch source {
	case "ba":
		hostsource = "go.eaciit.com:27123"
		dbsource = "ecgodrej"
	case "devel":
		hostsource = "52.220.25.190:27123"
		dbsource = "ecgodrej"
	case "prod":
		hostsource = "go.eaciit.com:27123"
		dbsource = "ecgodrej_prod"
	}

	switch dest {
	case "ba":
		hostdest = "go.eaciit.com:27123"
		dbdest = "ecgodrej"
	case "devel":
		hostdest = "52.220.25.190:27123"
		dbdest = "ecgodrej"
	case "prod":
		hostdest = "-h go.eaciit.com:27123"
		dbdest = "ecgodrej_prod"
	}

	if errmsg != "" {
		toolkit.Println(errmsg)
	}
	location := "/data/dump/godrej"
	numcol := len(listofcol)
	toolkit.Printfn("\nPrepare to dump & restore (%d) collections", numcol)
	toolkit.Printfn("from %s/%s to %s/%s\n",
		hostsource, dbsource, hostdest, dbdest)

	for i, col := range listofcol {
		dump := toolkit.Sprintf("mongodump -h %s -d %s -c %s --out %s", hostsource, dbsource, col, location)
		restore := toolkit.Sprintf("mongorestore -h %s -d %s -c %s --noIndexRestore --drop %s/%s/%s.bson ",
			hostdest, dbdest, col, location, dbsource, col)

		if runtime.GOOS == "windows" {
			_, err := exec.Command("sh", "-c", dump).Output()

			if err != nil {
				toolkit.Println("error", err)
			} else {
				toolkit.Printfn("(%d of %d) dump : %s", i, numcol, col)
			}

			_, err = exec.Command("cmd", "-c", restore).Output()

			if err != nil {
				toolkit.Println(err)
			} else {
				toolkit.Printfn("(%d of %d) restore : %s", i, numcol, col)
			}
		} else {
			_, err := exec.Command("/bin/bash", "-c", dump).Output()

			if err != nil {
				toolkit.Println(err)
			} else {
				toolkit.Printfn("(%d of %d) dump : %s", i, numcol, col)
			}

			_, err = exec.Command("/bin/bash", "-c", restore).Output()

			if err != nil {
				toolkit.Println(err)
			} else {
				toolkit.Printfn("(%d of %d) restore : %s", i, numcol, col)
			}
		}
	}

	toolkit.Printfn("\nDone dumping & restoring (%d) collections", numcol)
	toolkit.Printfn("from %s/%s to %s/%s\n",
		hostsource, dbsource, hostdest, dbdest)

	return
}
