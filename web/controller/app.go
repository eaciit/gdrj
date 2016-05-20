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
	ViewPath         = "web/view"
	LayoutFile       = fmt.Sprintf("%s/layout.html", ViewPath)
	IncludeFiles     = includeFiles("_head", "_menu", "_script_template")
	AppBasePath      = func(dir string, err error) string { return dir }(os.Getwd())
	GDRJ_DATA_PATH   = filepath.Join(AppBasePath, "data")
	GDRJ_CONFIG_PATH = filepath.Join(AppBasePath, "config")
)

func includeFiles(files ...string) []string {
	for i := 0; i < len(files); i++ {
		files[i] = fmt.Sprintf("%s/%s.html", ViewPath, files[i])
	}
	return files
}

func View(file string) string {
	return fmt.Sprintf("%s/%s", ViewPath, file)
}

func init() {
	fmt.Println("Base Path ===> ", AppBasePath)

	if GDRJ_DATA_PATH != "" {
		fmt.Println("GDRJ_DATA_PATH ===> ", GDRJ_DATA_PATH)
		fmt.Println("GDRJ_CONFIG_PATH ===> ", GDRJ_CONFIG_PATH)
	}
}
