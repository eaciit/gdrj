package helper

import (
	"fmt"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	"io"
	"os"
	"path/filepath"
	"strings"
)

var (
	DebugMode bool
)

func HandleError(err error, optionalArgs ...interface{}) bool {
	if err != nil {
		fmt.Printf("error occured: %s", err.Error())

		if len(optionalArgs) > 0 {
			optionalArgs[0].(func(bool))(false)
		}

		return false
	}

	if len(optionalArgs) > 0 {
		optionalArgs[0].(func(bool))(true)
	}

	return true
}

func CreateResult(success bool, data interface{}, message string) map[string]interface{} {
	if !success {
		fmt.Println("ERROR! ", message)
		if DebugMode {
			panic(message)
		}
	}

	return map[string]interface{}{
		"data":    data,
		"success": success,
		"message": message,
	}
}

func ImageUploadHandler(r *knot.WebContext, filename, dstpath string) (error, string) {
	file, handler, err := r.Request.FormFile(filename)
	if err != nil {
		return err, ""
	}
	defer file.Close()

	newImageName := toolkit.RandomString(32) + filepath.Ext(handler.Filename)
	dstSource := dstpath + toolkit.PathSeparator + newImageName
	f, err := os.OpenFile(dstSource, os.O_WRONLY|os.O_CREATE, 0666)
	if err != nil {
		return err, ""
	}
	defer f.Close()
	io.Copy(f, file)

	return nil, newImageName
}

func UploadFileHandler(r *knot.WebContext, tempfile, dstpath, filename string) (error, string, string, string) {
	file, handler, err := r.Request.FormFile(tempfile)
	if err != nil {
		return err, "", "", ""
	}
	defer file.Close()

	ext := filepath.Ext(handler.Filename)
	newFileName := filename + ext
	dstSource := dstpath + toolkit.PathSeparator + newFileName
	f, err := os.OpenFile(dstSource, os.O_WRONLY|os.O_CREATE, 0666)
	if err != nil {
		return err, "", "", ""
	}
	defer f.Close()
	io.Copy(f, file)

	return nil, handler.Filename, newFileName, strings.Split(ext, ".")[1]
}
