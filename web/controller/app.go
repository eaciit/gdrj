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
	LayoutFile       string   = "views/layout.html"
	IncludeFiles     []string = []string{"views/_head.html", "views/_loader.html", "views/_miniloader.html"}
	AppBasePath      string   = func(dir string, err error) string { return dir }(os.Getwd())
	GDRJ_DATA_PATH   string   = filepath.Join(AppBasePath, "data")
	GDRJ_CONFIG_PATH string   = filepath.Join(AppBasePath, "config")
)

func init() {
	fmt.Println("Base Path ===> ", AppBasePath)

	if GDRJ_DATA_PATH != "" {
		fmt.Println("GDRJ_DATA_PATH ===> ", GDRJ_DATA_PATH)
		fmt.Println("GDRJ_CONFIG_PATH ===> ", GDRJ_CONFIG_PATH)
	}
}
