package main

import (
    "time"
    "github.com/eaciit/toolkit"
    "github.com/eaciit/dbox"
    "eaciit/gdrj/model"
    "errors"
)

type Allocation struct {
	ID        string `bson:"_id"`
	Ledger    string
    HasSKU bool
    HasOutlet bool
    HasPC bool 
    HasCC bool
  	GroupByPC bool
    GroupByCC bool
    GroupByOutlet bool
    GroupBySKU bool
}

func (a *Allocation) getCursor(conn dbox.IConnection, filter *dbox.Filter)(dbox.Cursor, error){
    ls0 := gdrj.LedgerSummary{}
    q := conn.NewQuery().
        From(ls0.TableName()).
        Where(filter)
    
    q = q.Group("plcode")
    q = q.Group("ledgeraccount")
    if a.HasOutlet{
        q = q.Group("outletid")
    }
    
    if a.HasSKU{
        q = q.Group("skuid")
    }
    
    if a.HasPC{
        q = q.Group("pcid")
    }
    
    if a.HasCC{
        q = q.Group("ccid")
    }
    q = q.Aggr(dbox.AggrSum,"value1","Amount")
    c, e = q.Cursor(nil)    
    if e!=nil {
        return nil, errors.New("getCursor: " + e.Error())
    } 
    return c, nil
}

func (a *Allocation) Allocate(conn dbox.IConnection, filter *dbox.Filter, outTo string)error{
    c, e := a.getCursor(conn, filter)
    if e!=nil {
        return errors.New("Allocate: " + e.Error())
    }
    defer c.Close()
    
    for{
        m := new(toolkit.M)
        ls := new(gdrj.LedgerSummary)
        e = c.Fetch(&m, 1, false)
        if e!=nil {
            break
            //return errors.New("Allocate: Fetch: " + e.Error())
        }
        
        var f1sales []*dbox.Filter
        f1sales = append(f1sales, filter)
        if a.HasSKU{
            f1sales = append(f1sales,dbox.Eq("skuid",m.GetString("_id.skuid")))
        }
        if a.HasOutlet{
            f1sales = append(f1sales,dbox.Eq("outletid", m.GetString("_id.outletid")))
        }
        if a.HasPC{
            f1sales = append(f1sales,dbox.Eq("pcid",m.GetString("_id.pcid")))
        }
        if a.HasCC{
            f1sales = append(f1sales,dbox.Eq("ccid",m.GetString("_id.ccid")))
        }
        f1sales = append(f1sales, dbox.Eq("plcode","PL8A"))
        fsales := dbox.And(f1sales...)
        
        //--- get sales for respective selections
        e = func(){
            var asales Allocation
            asales = *a
            asales.HasCC=false
            asales.HasPC=false
            asales.HasOutlet=true
            asales.HasSKU=true
            csales, ecsales := asales.getCursor(conn, fsales)
            if ecsales!=nil {
                return errors.New("Allocate: GetSales: " + e.Error())
            }
            defer csales.Close()
            
            loopSales:=true
            for;loopSales;{
                msales:=toolkit.M{}
                esales:=csales.Fetch(&msales,1,false)    
                if esales!=nil{
                    return errors.New("Allocate: FetchSales: " + e.Error())
                }
                
                newLs := new(gdrj.LedgerSummary)
                newLs.CompanyCode = m.GetString("_id.companycode")
                newLs.LedgerAccount = m.GetString("_id.ledgeraccount")
                newLs.PLCode = m.GetString("_id.plcode")
                newLs.PLOrder = m.GetString("_id.plorder")
                newLs.Date = gdrj.NewDate(
                    m.GetInt("_id.date.year"),
                    m.GetInt("_id.date.month"),
                    1)
                newLs.pcid = 
            }
        }()
        if e!=nil {
            return e
        }
    }
    
    return nil
}

func Allocate(ls *gdrj.LedgerSummary, allocate *Allocation)error{
    filters := []*dbox.Filter{}
    filters = append(filters, dbox.Eq("companycode",ls.CompanyCode))
    filters = append(filters, dbox.Eq("date.year",ls.Date.Year))
    filters = append(filters, dbox.Eq("date.month",ls.Date.Month))
    filters = append(filters, dbox.Eq("ledgeraccount",ls.LedgerAccount))
    filters = append(filters, dbox.Eq("plcode",ls.PLCode))  
}
