package controller

import (
	"fmt"
	"github.com/eaciit/knot/knot.v1"
	"os"
	"path/filepath"
	"strings"
)

type App struct {
	Server *knot.Server
}

var (
	ViewPath         = "web/view"
	LayoutFile       = fmt.Sprintf("%s/layout.html", ViewPath)
	IncludeFiles     = includeFiles()
	AppBasePath      = func(dir string, err error) string { return dir }(os.Getwd())
	GDRJ_DATA_PATH   = filepath.Join(AppBasePath, "data")
	GDRJ_CONFIG_PATH = filepath.Join(AppBasePath, "config")
)

func includeFiles() []string {
	files := []string{}
	basePath, _ := os.Getwd()

	filepath.Walk(filepath.Join(basePath, ViewPath), func(path string, info os.FileInfo, err error) error {
		ok1 := strings.HasPrefix(info.Name(), "_")
		ok2 := strings.HasPrefix(info.Name(), "page-report-")

		if ok1 || ok2 {
			viewFile := filepath.Join(ViewPath, info.Name())
			files = append(files, viewFile)
		}

		return nil
	})

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
