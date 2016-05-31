package gdrj

import (
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"errors"
)

// ==================================== Module

type Module struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Name          string
	Description   string
	BuildPath     string
	IsCompiled    bool //if false do extract and build
	LastCompile   time.Time
	ExecFile      string
	AddParam      []string //except base param, startperiode,endperiode,outletid,skuid
	IsActive      bool
}

func (m *Module) RecordID() interface{} {
	return m.ID
}

func (m *Module) TableName() string {
	return "module"
}

func (m *Module) PreSave() error {
	if m.ID == "" {
		m.ID = toolkit.RandomString(32)
	}

	if !m.IsCompiled {
		//Extract and build, save exec file

		m.IsCompiled = true
		m.LastCompile = time.Now().UTC()
		m.IsActive = true
	}
	//save using base,

	return nil
}

func (m *Module) Get(search string) ([]Module, error) {
	var query *dbox.Filter

	if search != "" {
		query = dbox.And(dbox.Contains("_id", search), dbox.Eq("isactive", true))
	}

	data := []Module{}
	cursor, err := Find(new(Module), query, nil)
	if err != nil {
		return nil, err
	}
	if err := cursor.Fetch(&data, 0, false); err != nil {
		return nil, err
	}
	defer cursor.Close()
	return data, nil
}

func (m *Module) BuildFile(filename string, basepath string) error {
	var path string
	var fullPath string
	if runtime.GOOS == "windows" {
		pathSplit := strings.Split(m.BuildPath, "/")
		for i, val := range pathSplit {
			if i == 0 {
				path = val
			} else {
				path += "\\" + val
			}
		}
		
		fullPath = filepath.Join(basepath, "modules", path)
		err := exec.Command("cmd", "/c", "cd", fullPath).Run()
		if err != nil {
			return err
		}
		
		err = exec.Command("cmd", "/c", "go build", "-o", filepath.Join(fullPath, m.Name+".exe")).Run()
		if err != nil {
			return err
		}

		m.ExecFile = m.Name + ".exe"
	} else {
		fullPath = filepath.Join(basepath, "modules", m.Name, m.BuildPath)
		/*
		err := exec.Command("cd", fullPath).Run()
		if err != nil {
			return errors.New( 
				toolkit.Sprintf("cd %s: ", fullPath) + err.Error())
		}
		*/
		binFileName := filepath.Join(fullPath, m.Name+".bin")
		command := toolkit.Sprintf("\"cd %s && go build -o %s\"",
			fullPath, binFileName)
		err := toolkit.RunCommand("bash", "-c",command).Run()
		if err != nil {
			return errors.New(toolkit.Sprintf("bash -c %s", 
				command) + err.Error())
		}

		m.ExecFile = m.Name + ".bin"
	}

	m.CompileFile(fullPath)
	return nil
}

func (m *Module) CompileFile(fullpath string) error {
	if runtime.GOOS == "windows" {
		/*_ = `SC CREATE <servicename>
		Displayname= "<servicename>"
		binpath= "srvstart.exe <servicename> -c
		<path to srvstart config file>" start= <starttype>`*/
		exePath := filepath.Join(fullpath, m.Name+".exe")
		srvstart := "srvstart.exe " + m.Name + " -c " + exePath
		err := exec.Command("cmd", "/c", "sc", "create", m.Name,
			"Displayname= ", m.Name, "binpath= ", srvstart, "start= auto").Run()
		if err != nil {
			return err
		}
	} else {
		err := exec.Command("nohup", "./", m.Name).Run()
		if err != nil {
			return err
		}
	}
	return nil
}

func (m *Module) ExtractFile(compressedSource string, fileName string) error {
	compressedFile := filepath.Join(compressedSource, fileName)
	extractDest := filepath.Join(compressedSource, m.Name)

	if err := os.RemoveAll(extractDest); err != nil {
		return err
	}

	if strings.Contains(fileName, ".tar.gz") {
		if err := toolkit.TarGzExtract(compressedFile, extractDest); err != nil {
			return err
		}
	} else if strings.Contains(fileName, ".gz") {
		if err := toolkit.GzExtract(compressedFile, extractDest); err != nil {
			return err
		}
	} else if strings.Contains(fileName, ".tar") {
		if err := toolkit.TarExtract(compressedFile, extractDest); err != nil {
			return err
		}
	} else if strings.Contains(fileName, ".zip") {
		if err := toolkit.ZipExtract(compressedFile, extractDest); err != nil {
			return err
		}
	}

	if err := os.Remove(compressedFile); err != nil {
		return err
	}

	return nil
}

// func (m *Module) IsCompiled() bool {
// 	return m.ExePath != ""
// }
