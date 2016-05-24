package controller

import (
	"github.com/eaciit/knot/knot.v1"
)

type ReportController struct {
	App
}

func CreateReportController(s *knot.Server) *ReportController {
	var controller = new(ReportController)
	controller.Server = s
	return controller
}
