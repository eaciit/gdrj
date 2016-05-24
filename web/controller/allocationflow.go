package controller

import (
	"github.com/eaciit/knot/knot.v1"
)

type AllocationFlowController struct {
	App
}

func CreateAllocationFlowController(s *knot.Server) *AllocationFlowController {
	var controller = new(AllocationFlowController)
	controller.Server = s
	return controller
}
