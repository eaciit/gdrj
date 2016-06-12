package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"sync"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"gopkg.in/mgo.v2/bson"
    "strings"
)

var conn dbox.IConnection
var count int
var wg *sync.WaitGroup
var mtx *sync.Mutex

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

type alloc struct {
	Total  float64
	Ratios []*gdrj.SalesRatio
}

var (
	//ledgers = toolkit.M{}
	plmodels = toolkit.M{}
	pcs      = toolkit.M{}
	ccs      = toolkit.M{}
	prods    = toolkit.M{}
	custs    = toolkit.M{}
	ratios   = map[string]*alloc{}
)

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, nil, nil)
	if e != nil {
		return nil
	}
	return c
}
//var cogss = map[string]*cogs{}
func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("START...")
	crx, err := conn.NewQuery().
        From(new(gdrj.RawDataPL).TableName()).
        //Where(dbox.In("src","31052016SAP_DISC-RDJKT","30052016SAP_EXPORT")).
		Cursor(nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count := crx.Count()
	jobs := make(chan *gdrj.RawDataPL, count)
	result := make(chan string, count)

	for wi := 1; wi < 10; wi++ {
		go worker(wi, jobs, result)
	}

	i := 0
	step := count / 100
	limit := step
	t0 := time.Now()
	for {
		//datas := []gdrj.RawDataPL{}
		data := new(gdrj.RawDataPL)
        err = crx.Fetch(data,1, false)
		if err != nil {
			toolkit.Printfn("Exit loop: %s", err.Error())
			break
		}

        i++
        jobs <- data
    
        if i >= limit {
            toolkit.Printfn("Calc %d of %d (%dpct) in %s", i, count, i*100/count,
                time.Since(t0).String())
            limit += step
        }
	}
	close(jobs)

	toolkit.Println("Saving")
	limit = step
	for ri := 0; ri < count; ri++ {
		<-result
		if ri >= limit {
			toolkit.Printfn("Saving %d of %d (%dpct) in %s", ri, count, ri*100/count,
				time.Since(t0).String())
			limit += step
		}
	}

    saveOtherTable("tmpapintra2016","APROMO")
    saveOtherTable("tmpfreight2016","FREIGHT")
    saveOtherTable("tmpmegasari2016","APROMO")
    //saveOtherTable("tmpsusemi2016","APROMO")
    saveOtherTable("tmproyalti201516","ROYALTI")
    saveOtherTable("tmpsga2016","SGAPL")

    toolkit.Printfn("Done %s", time.Since(t0).String())
}

func saveOtherTable(tablename string, src string){
    toolkit.Printfn("START PROCESSING %s", tablename)

    qdata, _ := conn.NewQuery().From(tablename).Cursor(nil)
    defer qdata.Close()

    objCount := qdata.Count()
    jobs := make(chan toolkit.M, objCount)
    outs := make(chan string, objCount)

    for wi:=0;wi<10;wi++{
        go workerSave(src, jobs, outs)
    }

    i:=0
    for{

        m := toolkit.M{}
        e := qdata.Fetch(&m,1,false)
        if e!=nil {
            break
        }
        i++
        jobs <- m
        toolkit.Printfn("Sending %s | %d of %d", tablename, i, objCount)
    }
    close(jobs)

    for i:=1;i<=objCount;i++{
        toolkit.Printfn("Receiving %s | %d of %d", tablename, i, objCount)
    }
    close(outs)
}

func workerSave(src string, jobs <-chan toolkit.M, outs chan<- string){
    workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()

    for m := range jobs{
        r := new(gdrj.RawDataPL)
        r.Year = 2015
        r.Src=src
        r.Account = toolkit.ToString(m.GetInt("glaccount"))
        r.Grouping = m.GetString("grouping")
        r.Period = m.GetInt("period")
        r.CCID = m.GetString("ccid")
        r.CostCenterName = m.GetString("ccname")
        r.AmountinIDR = m.GetFloat64("amount")
        r.EntityID = m.GetString("cocd")
        r.APProposalNo = m.GetString("proposalno")
        r.PCID = m.GetString("pcid")
        if r.AmountinIDR==0 {
            amountInStr := m.GetString("amount")
            if amountInStr!=""{
                r.AmountinIDR = toolkit.ToFloat64(amountInStr,0,toolkit.RoundingAuto)
            }
        }
        r.ID = bson.NewObjectId().String()
        e := workerConn.NewQuery().From(r.TableName()).Save().Exec(toolkit.M{}.Set("data",r))
        if e!=nil {
            toolkit.Printfn("Error save %s: \n%s", toolkit.JsonString(r), e.Error())
            os.Exit(100)
        }
    }
}

func worker(wi int, jobs <-chan *gdrj.RawDataPL, r chan<- string) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()

    for m := range jobs {
        lowersrc := strings.ToLower(m.Src)
		if strings.Contains(lowersrc,"salesrd"){
            m.Src="SALESRD"
        } else if strings.Contains(lowersrc,"disc-rd"){
            m.Src="DISCRD"
        } else if strings.Contains(lowersrc,"export"){
            m.Src="EXPORT"
        } else if strings.Contains(lowersrc,"freight"){
            m.Src="FREIGHT"
        } else if strings.Contains(lowersrc,"sgapl"){
            m.Src="SGAPL"
        } else {
            m.Src="APROMO"
        }
		workerConn.NewQuery().From(m.TableName()).Save().Exec(toolkit.M{}.Set("data",m))
	    r <- "OK " + m.OutletName
	}
}
