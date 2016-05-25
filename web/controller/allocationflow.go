package controller

import (
	"eaciit/gdrj/web/helper"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type AllocationFlowController struct {
	App
}

func CreateAllocationFlowController(s *knot.Server) *AllocationFlowController {
	var controller = new(AllocationFlowController)
	controller.Server = s
	return controller
}

func (d *AllocationFlowController) GetModules(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result := []toolkit.M{
		{"_id": "n001", "Name": "Module Lorem"},
		{"_id": "n002", "Name": "Module Ipsum"},
		{"_id": "n003", "Name": "Module Dolor"},
		{"_id": "n004", "Name": "Module Sit"},
		{"_id": "n005", "Name": "Module Amet"},
	}

	return helper.CreateResult(true, result, "")
}

func (d *AllocationFlowController) GetAppliedModules(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result := []toolkit.M{
		{"_id": "n001", "Name": "Module Lorem"},
		{"_id": "n002", "Name": "Module Ipsum"},
		{"_id": "n003", "Name": "Module Dolor"},
		{"_id": "n004", "Name": "Module Sit"},
		{"_id": "n005", "Name": "Module Amet"},
	}

	return helper.CreateResult(true, result, "")
}
