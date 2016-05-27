vm.currentMenu('Organization')
vm.currentTitle("Organization")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Organization', href: '/organization' }
])

viewModel.Or = new Object()
let or = viewModel.Or

or.templateDiagram = [{
    FullName: "Naveen Gupta",
    Position: "Bussiness Head Indonesia",
    Image: "08_naveen.png",
    Color: "#FF4545",
    Items: [
    	{
    		FullName: "Ardiahty Bachtiar",
		    Position: "National Key Account Manager",
		    Image: "05-aridarthy-bachtiar.png",
		    Color: "#4592FF",
		    Items: [
		    	{
		    		FullName: "Veronica Linggautama",
				    Position: "Head - Sourcing & Procurement",
				    Image: "03-veronica-linggautama.png",
				    Color: "#45FFB5",
				    Items: []
		    	},
		    	{
		    		FullName: "Ronald Susanto",
				    Position: "Sales Project and Practices Manager",
				    Image: "04-ronald-susanto.png",
				    Color: "#45FFB5",
				    Items: []
		    	},
		    	{
		    		FullName: "Sari Dewi",
				    Position: "Marketing Manager",
				    Image: "08-sari-dewi.png",
				    Color: "#45FFB5",
				    Items: []
		    	},	
		    	{
		    		FullName: "Ng Meiling",
				    Position: "Marketing Manager",
				    Image: "meiling.png",
				    Color: "#45FFB5",
				    Items: []
		    	},
		    	{
		    		FullName: "Wahyu Rahmad",
				    Position: "Department Head - Technical",
				    Image: "07-wahyu-rahmat.png",
				    Color: "#45FFB5",
				    Items: []
		    	},
		    	{
		    		FullName: "Ira Ryanto",
				    Position: "Head - Finance & Accounting Manufacturing",
				    Image: "06-ira-ryanto.png",
				    Color: "#45FFB5",
				    Items: []
		    	}
		    ]
    	}
    ],
}]

or.visualTemplate = (options) => {
    let dataviz = kendo.dataviz
    let g = new dataviz.diagram.Group()
    let dataItem = options.dataItem

    g.append(new dataviz.diagram.Rectangle({
        width: 150,
        height: 200,
        stroke: {
            width: 0
        },
        fill: {
            gradient: {
                type: "tree",
                stops: [{
                    color: dataItem.Color,
                    offset: 0,
                    // opacity: 0.5
                }, {
                    color: dataItem.Color,
                    offset: 1,
                    // opacity: 1
                }]
            }
        }
    }));

    g.append(new dataviz.diagram.TextBlock({
        text: dataItem.FullName,
        x: 3,
        y: 146,
        width: 140,
        height: 23,
        fill: "#fff",
        fontStyle: "text-align:center;",
        fontSize: 16
    }));

    g.append(new dataviz.diagram.TextBlock({
        text: dataItem.Position,
        x: 3,
        y: 170,
        width: 140,
        height: 20,
        fill: "#fff",
        fontStyle: "text-align:center;",
        fontSize: 16
    }));

    g.append(new dataviz.diagram.Image({
        source: "/res/img/diagram/" + dataItem.Image,
        x: 3,
        y: 3,
        width: 140,
        height: 140
    }))
    return g;
}

or.creatediagram = () => {
	$("#diagram").kendoDiagram({
        dataSource: new kendo.data.HierarchicalDataSource({
            data: or.templateDiagram,
            schema: {
                model: {
                    children: "Items"
                }
            }
        }),
        editable: false,
        layout: {
            type: "tree",
            subtype: "down",
            horizontalSeparation: 100,
            verticalSeparation: 15,
            grid: {
            	offsetX: 150
            }
        },
        shapeDefaults: {
            visual: or.visualTemplate,
        },
        connectionDefaults: {
            stroke: {
                color: "#979797",
                width: 2
            }
        },
        zoomMin: 0.8,
        zoomMax: 0.8,
    });

    var diagram = $("#diagram").getKendoDiagram()
    diagram.bringIntoView(diagram.shapes)
}

$(() => {
	or.creatediagram()
})