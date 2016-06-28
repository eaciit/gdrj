package controller

import (
	"fmt"
	"github.com/eaciit/knot/knot.v1"
	"os"
	"path/filepath"
)

type App struct {
	Server *knot.Server
}

var (
	LayoutFile       = "layout.html"
	AppBasePath      = func(dir string, err error) string { return dir }(os.Getwd())
	GDRJ_DATA_PATH   = filepath.Join(AppBasePath, "data")
	GDRJ_CONFIG_PATH = filepath.Join(AppBasePath, "config")
)

func init() {
	fmt.Println("Base Path ===> ", AppBasePath)

	if GDRJ_DATA_PATH != "" {
		fmt.Println("GDRJ_DATA_PATH ===> ", GDRJ_DATA_PATH)
		fmt.Println("GDRJ_CONFIG_PATH ===> ", GDRJ_CONFIG_PATH)
	}
}
