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
    
    loop := true
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
        f1sales = append(f1sales, dbox.Eq("",""))
        fsales := dbox.And(f1sales...)
        
        //--- get sales for respective selections
    }
    
    return nil
}
