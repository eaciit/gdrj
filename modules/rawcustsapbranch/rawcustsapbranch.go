package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/toolkit"
	"os"
	"runtime"
	"strings"
	"sync"
)

func setinitialconnection() {
	conn, err := modules.GetDboxIConnection("db_godrej")

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
	runtime.GOMAXPROCS(runtime.NumCPU())
	var mwg sync.WaitGroup
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("START CUST SAP BRANCH...")

	cbr, err := gdrj.Find(new(gdrj.RawCustSAPBranch), nil, nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	rawsapbranch := []*gdrj.RawCustSAPBranch{}
	_ = cbr.Fetch(&rawsapbranch, 0, false)

	/*i := 0
	c := cbr.Count()*/
	for _, rawcust := range rawsapbranch {
		mwg.Add(1)
		go func(rcs *gdrj.RawCustSAPBranch) {
			defer mwg.Done()
			/*i++
			if i%10000 == 0 {
				toolkit.Printfn("%d of %d", i, c)
			}*/
			cust := new(gdrj.Customer)
			cust.ID = rcs.CSCODE
			cust.Name = rcs.CSNAME
			cust.BranchID = rcs.CSPLANT
			branch := new(gdrj.Branch)
			gdrj.Get(branch, cust.BranchID)
			cust.BranchName = branch.Name
			cust.CustAddr1 = rcs.CSADDR1
			cust.CustAddr2 = rcs.CSADDR2
			cust.DepoID = rcs.CSDEPO
			cust.DepoName = rcs.CSDEPOTXT
			cust.KeyAccount = rcs.ACCTGRP //to be confirmed
			custtype := strings.Split(rcs.CSTYPETXT, "-")
			cust.CustType = strings.TrimSpace(custtype[0])
			cust.ChannelID = rcs.CSCHANNEL
			channel := new(gdrj.Channel)
			gdrj.Get(channel, cust.ChannelID)
			cust.ChannelName = channel.Name
			cust.CustomerGroup = rcs.CSGROUP
			custGroup := new(gdrj.CustomerGroup)
			gdrj.Get(custGroup, cust.CustomerGroup)
			cust.CustomerGroupName = custGroup.Name
			cust.AreaID = rcs.CSCITY
			cust.AreaName = rcs.CSCITYTXT
			geo := new(gdrj.HGeographi)
			gdrj.Get(geo, cust.AreaName)
			cust.National = geo.National
			cust.Zone = geo.Zone
			cust.Region = geo.Region
			_ = gdrj.Save(cust)
		}(rawcust)
		mwg.Wait()
	}
	defer cbr.Close()
	toolkit.Println("END OF CUST SAP BRANCH...")

	toolkit.Println("START CUST SAP RD...")
	crd, err := gdrj.Find(new(gdrj.RawCustSAPRD), nil, nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	rawsaprd := []*gdrj.RawCustSAPRD{}
	_ = crd.Fetch(&rawsaprd, 0, false)
	/*i := 0
	c := crd.Count()*/
	for _, rawcust := range rawsaprd {
		mwg.Add(1)
		go func(rcs *gdrj.RawCustSAPRD) {
			defer mwg.Done()
			/*i++
			if i%10000 == 0 {
				toolkit.Printfn("%d of %d", i, c)
			}*/
			cust := new(gdrj.Customer)
			/*if rcs.CS_SAP == "0" {
				cust.ID = rcs.CS_CODE
			} else {
				cust.ID = rcs.CS_SAP
			}*/
			cust.ID = rcs.CS_CODE
			cust.Name = rcs.CS_NAME
			cust.ChannelID = rcs.CS_CHANNEL
			channel := new(gdrj.Channel)
			gdrj.Get(channel, cust.ChannelID)
			cust.ChannelName = channel.Name
			cust.AreaID = rcs.CS_CITY
			cust.AreaName = rcs.CS_CITYTXT
			geo := new(gdrj.HGeographi)
			gdrj.Get(geo, cust.AreaName)
			cust.National = geo.National
			cust.Zone = geo.Zone
			cust.Region = geo.Region
			_ = gdrj.Save(cust)
		}(rawcust)
		mwg.Wait()
	}
	defer crd.Close()
	toolkit.Println("END OF CUST SAP RD...")
}
