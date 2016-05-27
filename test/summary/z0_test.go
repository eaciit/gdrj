package testsummary

import (
    "testing"
    "github.com/eaciit/toolkit"
    "github.com/eaciit/dbox"
    "github.com/eaciit/orm"
    _ "github.com/eaciit/dbox/dbc/mongo"
    "eaciit/gdrj/model"
    "strings"
    "os"
)

var (
    _db dbox.IConnection
    e error
)

func DB()dbox.IConnection{
    if _db==nil {
        ci := &dbox.ConnectionInfo{"localhost:27123", "ecgodrej", "", "", toolkit.M{}.Set("timeout", 3)}
        conn, err := dbox.NewConnection("mongo",ci)
        
        if err!=nil{
            toolkit.Println("Error:", err.Error())
            os.Exit(200)
        }

        err = conn.Connect()
        if err!=nil {
            toolkit.Println("Error:", err.Error())
            os.Exit(200)
        }
        _db = conn
        gdrj.SetDb(_db)
     }
    return _db
}

var _ctx *orm.DataContext

func Ctx() *orm.DataContext{
    _ctx = orm.New(DB())
    return _ctx
}

func Test(t *testing.T) {
    ctx := Ctx()
    
    ctx.Connection.NewQuery().From(new(gdrj.LedgerSummary).TableName()).Delete().Exec(nil)
    
    for i:=1;i<=1000;i++{
        s := new(gdrj.LedgerSummary)
        s.CompanyCode="C01"
        s.Date = &gdrj.Date{Year:2015,Month:4,}
        s.LedgerAccount = toolkit.Sprintf("%d",toolkit.RandInt(200000)+700000)
        if len(s.LedgerAccount)<10{
            s.LedgerAccount=strings.Repeat("0",10-len(s.LedgerAccount)) + s.LedgerAccount
        }
        s.Value1 = toolkit.ToFloat64(toolkit.RandInt(1000000),0,toolkit.RoundingAuto)
        s.Value2 = toolkit.ToFloat64(toolkit.RandInt(1000),0,toolkit.RoundingAuto)
        e = ctx.Save(s)    
        if e!=nil {
            t.Fatalf("Error saving record %d: %s\n%s",i,toolkit.JsonString(s),e.Error())
        }  
    }
}

func TestSummarize(t *testing.T) {
    ms, e := gdrj.SummarizeLedgerSum(nil,
        []string{"companycode"},
        []string{"sum:$value1:Total","sum:1:RecordCount"},
        nil)
   if e!=nil {
       t.Fatalf("Error: %s", e.Error())
   }
   toolkit.Println(ms)
}

func TestClose(t *testing.T){
    if DB()!=nil{
        DB().Close()
    }
}