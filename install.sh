rm -rf gdrjprod
go build
echo '' > log.txt
sudo ./gdrjprod > log.txt &