package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "strings"
	"sync"
	"time"
)

var conn dbox.IConnection
var count, ird, irddisc, iexp, idiscount int

// var mwg sync.WaitGroup

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

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, nil, nil)
	if e != nil {
		return nil
	}
	return c
}

func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("START...")

	crx, err := gdrj.Find(new(gdrj.SalesPL),
		nil,
		toolkit.M{})

	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count = crx.Count()

	jobs := make(chan *gdrj.SalesTrx, count)
	result := make(chan int, count)
	toolkit.Println("Prepare Worker")
	for wi := 0; wi < 10; wi++ {
		go worker(wi, jobs, result)
	}

	toolkit.Println("Total Data : ", count)
	step := count / 100
	i := 0
	t0 := time.Now()
	for {
		i++
		st := new(gdrj.SalesTrx)
		e := crx.Fetch(&st, 1, false)
		if e != nil {
			toolkit.Println("Error Found : ", e.Error())
			break
		}

		num := 0

		switch st.Src {
		case "RD":
			ird++
			num = ird
		case "RD-DISC":
			irddisc++
			num = irddisc
		case "DISCOUNT":
			idiscount++
			num = idiscount
		case "EXPORT":
			iexp++
			num = iexp
		default:
			st.Src = "VDIST"
		}

		if st.Src != "VDIST" {
			st.SalesHeaderID = toolkit.Sprintf("%v_%v_%v_%v_%v", st.Src, st.Year, st.Month, st.SKUID, num)
			st.ID = st.SalesHeaderID
		} else if st.Customer != nil && st.Customer.ChannelID == "I1" {
			continue
		}

		jobs <- st
		if i > step {
			toolkit.Printfn("Processing %d of %d in %s",
				i, count,
				time.Since(t0).String())
			step += count / 100
		}
	}

	close(jobs)
	mwg.Wait()

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func worker(wi int, jobs <-chan *gdrj.SalesTrx, result chan<- string) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()

	var j *gdrj.SalesTrx
	table := toolkit.Sprintf("%v_1", j.TableName())

	for j = range jobs {
		workerConn.NewQuery().From(table).
			Save().Exec(toolkit.M{}.Set("data", j))
	}

	mwg.Done()
}
