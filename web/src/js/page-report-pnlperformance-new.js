viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

;(() => {
	bkd.contentIsLoading = ko.observable(false)
	bkd.popupIsLoading = ko.observable(false)
	bkd.title = ko.observable('P&L Analytic')
	bkd.detail = ko.observableArray([])
	bkd.limit = ko.observable(10)
	bkd.breakdownNote = ko.observable('')

	bkd.breakdownBy = ko.observable('customer.channelname')
	bkd.breakdownByFiscalYear = ko.observable('date.fiscal')
	bkd.oldBreakdownBy = ko.observable(bkd.breakdownBy())

	bkd.data = ko.observableArray([])
	bkd.fiscalYear = ko.observable(rpt.value.FiscalYear())
	bkd.breakdownValue = ko.observableArray([])
	bkd.level = ko.observable(1)
	bkd.isBreakdownBranch = ko.observable(false)

	bkd.breakdownBranch_Channels = ko.observableArray([])
	bkd.breakdownBranch_ChannelRDNonRD = ko.observable('')
	bkd.breakdownBranch_SubChannel = ko.observable('')

	bkd.changeTo = (d, title) => {
		bkd.title(title)
		bkd.refresh()
	}

	bkd.isBreakdownBranchSubEnabled = (d) => ko.computed(() => {
		if (d == 'channel') {
			if (bkd.breakdownBranch_ChannelRDNonRD() != '') {
				return false
			} else

			if (bkd.breakdownBranch_SubChannel() != '') {
				return false
			}

			return true
		} else

		if (d == 'rd-non-rd') {
			if (bkd.breakdownBranch_Channels().length > 0) {
				return false
			} else

			if (bkd.breakdownBranch_SubChannel() != '') {
				return false
			}

			return true
		} else

		if (d == 'sub-channel') {
			if (bkd.breakdownBranch_Channels() != '') {
				return false
			} else

			if (bkd.breakdownBranch_ChannelRDNonRD() != '') {
				return false
			}

			return true
		}

		return true
	}, bkd)

	bkd.breakdownChannel = ko.observable('')
	bkd.breakdownChannels = ko.observableArray([])

	bkd.optionBreakdownRDNonRD = ko.observableArray([
		{ _id: "All", Name: "RD & Non RD" },
		{ _id: "RD", Name: "Only RD Sales" },
		{ _id: "NonRD", Name: "Non RD Sales" },
	])

	bkd.isBreakdownChannel = ko.observable(false)
	bkd.breakdownChannelLocation = ko.observable('')
	bkd.optionBreakdownChannelLocations = ko.observableArray([
		{ _id: "zone", Name: "Zone" },
		{ _id: "region", Name: "Region" },
		{ _id: "areaname", Name: "City" },
	])

	bkd.refresh = (useCache = false) => {
		if (bkd.breakdownValue().length == 0) {
			toolkit.showError('Please choose at least breakdown value')
			return
		}

		$('.breakdown-view:not(#pnl-analysis)').empty()

		let param = {}
		param.pls = []
		param.groups = rpt.parseGroups([bkd.breakdownBy()])
		param.aggr = 'sum'
		param.filters = rpt.getFilterValue(false, bkd.fiscalYear)

		let breakdownValue = bkd.breakdownValue().filter((d) => d != 'All')
		if (breakdownValue.length > 0) {
			param.filters.push({
				Field: bkd.breakdownBy(),
				Op: '$in',
				Value: bkd.breakdownValue()
			})
		}

		if (bkd.breakdownChannels().length > 0) {
			param.groups.push('customer.reportsubchannel')
			param.filters.push({
				Field: 'customer.channelname',
				Op: '$in',
				Value: bkd.breakdownChannels()
			})

			bkd.level(2)
		}

		if (bkd.breakdownChannelLocation() != '') {
			param.groups.push(`customer.${bkd.breakdownChannelLocation()}`)
			bkd.level(2)
		}

		// ====== BREAKDOWN BY BRANCH - CHANNEL

		if (bkd.breakdownBy() == 'customer.branchname') {
			if (bkd.breakdownBranch_Channels().length > 0) {
				param.groups.push('customer.channelname')
				param.filters.push({
					Field: 'customer.channelname',
					Op: '$in',
					Value: bkd.breakdownBranch_Channels()
				})
			} else

			if (bkd.breakdownBranch_ChannelRDNonRD() != '') {
				let values = []

				switch (bkd.breakdownBranch_ChannelRDNonRD()) {
					case 'All':
						values = []
					break;
					case 'RD':
						values = ['I1']
					break;
					case 'NonRD':
						values = rpt.masterData.Channel().map((d) => d._id)
							.filter((d) => d != 'I1')
					break;
				}

				param.groups.push('customer.channelname')

				if (values.length > 0) {
					param.filters.push({
						Field: 'customer.channelname',
						Op: '$in',
						Value: values
					})
				}
			} else 

			if (bkd.breakdownBranch_SubChannel() != '') {
				param.groups.push('customer.reportsubchannel')
				param.filters.push({
					Field: 'customer.channelname',
					Op: '$in',
					Value: [bkd.breakdownBranch_SubChannel()]
				})
			}
		}

		bkd.oldBreakdownBy(bkd.breakdownBy())
		bkd.contentIsLoading(true)

		let fetch = () => {
			toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
				if (res.Status == "NOK") {
					setTimeout(() => {
						fetch()
					}, 1000 * 5)
					return
				}

				if (rpt.isEmptyData(res)) {
					bkd.contentIsLoading(false)
					return
				}

				let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
				bkd.breakdownNote(`Last refreshed on: ${date}`)

				let data = bkd.buildStructure(res.Data.Data)
				bkd.data(data)
				rpt.plmodels(res.Data.PLModels)
				bkd.emptyGrid()
				bkd.contentIsLoading(false)
				bkd.render()
				rpt.prepareEvents()
			}, () => {
				bkd.emptyGrid()
				bkd.contentIsLoading(false)
			}, {
				cache: (useCache == true) ? 'breakdown chart' : false
			})
		}

		fetch()
	}

	bkd.clickExpand = (e) => {
		let right = $(e).find('i.fa-chevron-right').length
		let down = $(e).find('i.fa-chevron-down').length
		if (right > 0){
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '530px')
				$('.pivot-pnl .table-content').css('margin-left', '530px')
			}

			$(e).find('i').removeClass('fa-chevron-right')
			$(e).find('i').addClass('fa-chevron-down')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[statusvaltemp=hide]`).css('display', 'none')
			rpt.refreshHeight(e.attr('idheaderpl'))
		}
		if (down > 0) {
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '')
				$('.pivot-pnl .table-content').css('margin-left', '')
			}
			
			$(e).find('i').removeClass('fa-chevron-down')
			$(e).find('i').addClass('fa-chevron-right')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			rpt.hideAllChild(e.attr('idheaderpl'))
		}
	}

	bkd.emptyGrid = () => {
		$('#pnl-analysis').replaceWith(`<div class="breakdown-view ez" id="pnl-analysis"></div>`)
	}

	bkd.renderDetailSalesTrans = (breakdown) => {
		bkd.popupIsLoading(true)
		$('#modal-detail-ledger-summary').appendTo($('body'))
		$('#modal-detail-ledger-summary').modal('show')

		let columns = [
			// { field: '_id', title: 'ID', width: 100, locked: true },
			{ field: 'date', title: 'Date', width: 150, locked: true, template: (d) => {
				return moment(d.date).format('DD/MM/YYYY HH:mm')
			} },
			{ field: "grossamount", headerTemplate: '<div class="align-right">Gross</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } },
			{ field: "discountamount", headerTemplate: '<div class="align-right">Discount</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } },
			{ field: "netamount", headerTemplate: '<div class="align-right">Net Sales</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } },
			{ field: "salesqty", headerTemplate: '<div class="align-right">Sales Qty</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } },
			{ field: "customer.branchname", title: 'Branch', width: 100 },
			{ field: "product.name", title: 'Product', width: 250 },
			{ field: "product.brand", title: 'Brand', width: 100 },
		]

		let config = {
			dataSource: {
				transport: {
				    read: (options) => {
				    	let param = options.data
				    	param.tablename = "browsesalestrxs"
				    	param[bkd.breakdownBy()] = [breakdown]

				    	if (toolkit.isUndefined(param.page)) {
				    		param = $.extend(true, param, {
				    			take: 5,
				    			skip: 0,
				    			page: 1,
				    			pageSize: 5	
				    		})
				    	}

			            $.ajax({
			                type: "POST",
							url: "/databrowser/getdatabrowser",
			                contentType: "application/json; charset=utf-8",
			                dataType: 'json',
			                data: JSON.stringify(param),
			                success: (res) => {
								bkd.popupIsLoading(false)
								setTimeout(() => {
									options.success(res.data)
								}, 200)
			                },
			                error: () => {
								bkd.popupIsLoading(false)
			                }
			            });
			        },
			        pageSize: 5
				},
				schema: {
				    data: (d) => d.DataValue,
				    total: (d) => d.DataCount
				},
				serverPaging: true,
				columns: [],
				pageSize: 5,
			},
			sortable: true,
	        pageable: true,
	        scrollable: true,
			columns: columns,
		}

		$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
		$('.grid-detail').kendoGrid(config)
	}

	bkd.renderDetail = (plcode, breakdowns) => {
		bkd.popupIsLoading(true)
		$('#modal-detail-ledger-summary .modal-title').html('Detail')
		$('#modal-detail-ledger-summary').appendTo($('body'))
		$('#modal-detail-ledger-summary').modal('show')

		let titleParts = []
		for (let p in breakdowns) {
			if (breakdowns.hasOwnProperty(p)) {
				titleParts.push(breakdowns[p])
			}
		}

		$('#modal-detail-ledger-summary .modal-title').html(`Detail of ${titleParts.join(' ')}`)

		let columns = [
			{ title: 'Date', width: 120, locked: true, footerTemplate: 'Total :', template: (d) => moment(d.date.date).format('DD/MM/YYYY HH:mm'), attributes: { class: 'bold' } },
			// { field: `pldatas.${plcode}.amount`, width: 120, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: (d) => d[`pldatas.${plcode}.amount`].sum, format: '{0:n2}', attributes: { class: 'align-right' } },
			{ field: 'grossamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Gross</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.grossamount.sum, 'n0')}</div>`,  */ format: '{0:n2}', attributes: { class: 'align-right' } },
			{ field: 'discountamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Discount</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.discountamount.sum, 'n0')}</div>`,  */ format: '{0:n2}', attributes: { class: 'align-right' } },
			{ field: 'netamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Net Sales</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.netamount.sum, 'n0')}</div>`,  */ format: '{0:n2}', attributes: { class: 'align-right' } },
			// { title: 'Cost Center', template: (d) => toolkit.redefine(toolkit.redefine(d.cc, {}).name, ''), width: 250 },
			{ title: 'Outlet', template: (d) => toolkit.redefine(toolkit.redefine(d.customer, {}).name, ''), width: 200 },
			{ title: 'Branch', template: (d) => toolkit.redefine(toolkit.redefine(d.customer, {}).branchname, ''), width: 150 },
			{ title: 'Channel', template: (d) => toolkit.redefine(toolkit.redefine(d.customer, {}).channelname, ''), width: 150 },
			{ title: 'Brand', template: (d) => toolkit.redefine(toolkit.redefine(d.product, {}).brand, ''), width: 100 },
			{ title: 'Product', template: (d) => toolkit.redefine(toolkit.redefine(d.product, {}).name, ''), width: 250 },
		]

		let config = {
			dataSource: {
				transport: {
				    read: (options) => {
				    	let param = options.data
				    	param.filters = []

						for (let p in breakdowns) {
							if (breakdowns.hasOwnProperty(p)) {
								param.filters.push({
									field: p.replace(/_id_/g, '').replace(/_/g, '.'),
									op: "$eq",
									value: breakdowns[p]
								})
							}
						}

				    	if (toolkit.isUndefined(param.page)) {
				    		param = $.extend(true, param, {
				    			take: 5,
				    			skip: 0,
				    			page: 1,
				    			pageSize: 5	
				    		})
				    	}

			            $.ajax({
			                type: "POST",
							url: "/report/getpnldetail",
			                contentType: "application/json; charset=utf-8",
			                dataType: 'json',
			                data: JSON.stringify(param),
			                success: (res) => {
								bkd.popupIsLoading(false)
								setTimeout(() => {
									console.log("++++", res)
									options.success(res.Data)
								}, 200)
			                },
			                error: () => {
								bkd.popupIsLoading(false)
			                }
			            });
			        },
			        pageSize: 5
				},
				schema: {
				    data: (d) => d.DataValue,
				    total: (d) => d.DataCount
				},
		  //       aggregates: [
				// 	{ field: "netamount", aggregate: "sum" },
				// 	{ field: "grossamount", aggregate: "sum" },
				// 	{ field: "discountamount", aggregate: "sum" },
				// 	{ field: `pldatas.${plcode}.amount`, aggregate: 'sum' }
				// ],
				serverPaging: true,
				pageSize: 5,
			},
			sortable: true,
	        pageable: true,
	        scrollable: true,
			columns: columns,
			dataBound: (d) => {
				$('.grid-detail .k-pager-nav.k-pager-last').hide()
				
				setTimeout(() => {
					let pager = $('.grid-detail .k-pager-info')
					let text = `rows ${pager.html().split(" ").slice(0, 3).join(" ")}`
					pager.html(text)
				}, 10)
			}
		}

		console.log("======", config)

		$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
		$('.grid-detail').kendoGrid(config)
	}

	bkd.buildStructure = (data) => {
		let groupThenMap = (data, group) => {
			let op1 = _.groupBy(data, (d) => group(d))
			let op2 = _.map(op1, (v, k) => {
				let key = { _id: k, subs: v }
				let sample = v[0]

				for (let prop in sample) {
					if (sample.hasOwnProperty(prop) && prop != '_id') {
						key[prop] = toolkit.sum(v, (d) => d[prop])
					}
				}

				return key
			})

			return op2
		}

		if (bkd.breakdownChannels().length > 0) {
			let parsed = groupThenMap(data, (d) => {
				return d._id[`_id_${toolkit.replace(bkd.breakdownBy(), '.', '_')}`]
			}).map((d) => {
				let subs = groupThenMap(d.subs, (e) => {
					return e._id._id_customer_reportsubchannel
				}).map((e) => {
					e.breakdowns = e.subs[0]._id
					d.count = 1
					return e
				})

				d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
				d.breakdowns = d.subs[0]._id
				d.count = d.subs.length
				return d
			})
		
			bkd.level(2)
			let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
			return newParsed
		}

		if (bkd.breakdownChannelLocation() != '') {
			let parsed = groupThenMap(data, (d) => {
				return d._id[`_id_${toolkit.replace(bkd.breakdownBy(), '.', '_')}`]
			}).map((d) => {
				let subs = groupThenMap(d.subs, (e) => {
					return e._id[`_id_customer_${bkd.breakdownChannelLocation()}`]
				}).map((e) => {
					e.breakdowns = e.subs[0]._id
					d.count = 1
					return e
				})

				d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
				d.breakdowns = d.subs[0]._id
				d.count = d.subs.length
				return d
			})
		
			bkd.level(2)
			let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
			return newParsed
		}

		if (bkd.breakdownBy() == 'customer.branchname') {
			if (bkd.breakdownBranch_Channels().length > 0) {
				let parsed = groupThenMap(data, (d) => {
					return d._id[`_id_customer_branchname`]
				}).map((d) => {
					let subs = groupThenMap(d.subs, (e) => {
						return e._id[`_id_customer_channelname`]
					}).map((e) => {
						e.breakdowns = e.subs[0]._id
						d.count = 1
						return e
					})

					d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
					d.breakdowns = d.subs[0]._id
					d.count = d.subs.length
					return d
				})
			
				bkd.level(2)
				let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
				return newParsed
			}

			if (bkd.breakdownBranch_ChannelRDNonRD() != '') {
				let injectTotal = (data) => {
					let renderTotalColumn = (d) => {
						let totalColumn = {}
						totalColumn._id = 'Total'
						totalColumn.count = 1
						totalColumn.excludeFromTotal = true

						let totalSubColumn = {}
						totalSubColumn._id = 'Total'
						totalSubColumn.count = 1
						totalSubColumn.excludeFromTotal = true

						for (let p in d.subs[0]) {
							if (d.subs[0].hasOwnProperty(p) && p.search('PL') > -1) {
								totalColumn[p] = toolkit.sum(d.subs, (e) => e[p])
								totalSubColumn[p] = toolkit.sum(d.subs, (e) => e[p])
							}
						}

						totalColumn.subs = [totalSubColumn]
						return totalColumn
					}

					data.forEach((d) => {
						let totalColumn = renderTotalColumn(d)
						d.subs = [totalColumn].concat(d.subs)
						d.count = toolkit.sum(d.subs, (e) => e.count)
					})
				}

				let parsed = groupThenMap(data, (d) => {
					return d._id[`_id_customer_branchname`]
				}).map((d) => {
					let subs = groupThenMap(d.subs, (e) => {
						return (e._id._id_customer_channelid == 'I1') ? 'RD' : 'Non RD'
					}).map((e) => {
						e.breakdowns = e.subs[0]._id
						d.count = 1
						return e
					})

					d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
					d.breakdowns = d.subs[0]._id
					d.count = d.subs.length
					return d
				})
			
				bkd.level(2)
				// if (bkd.breakdownBranch_ChannelRDNonRD() == 'All') {
				// 	injectTotal(parsed)
				// }
				let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
				return newParsed
			}

			if (bkd.breakdownBranch_SubChannel() != '') {
				let parsed = groupThenMap(data, (d) => {
					return d._id[`_id_customer_branchname`]
				}).map((d) => {
					let subs = groupThenMap(d.subs, (e) => {
						return e._id._id_customer_reportsubchannel
					}).map((e) => {
						e.breakdowns = e.subs[0]._id
						d.count = 1
						return e
					})

					d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
					d.breakdowns = d.subs[0]._id
					d.count = d.subs.length
					return d
				})
			
				bkd.level(2)
				let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
				return newParsed
			}
		}

		let parsed = groupThenMap(data, (d) => {
			return d._id[`_id_${toolkit.replace(bkd.breakdownBy(), '.', '_')}`]
		}).map((d) => {
			d.breakdowns = d.subs[0]._id
			d.count = 1

			return d
		})

		bkd.level(1)
		let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
		return newParsed
	}

	bkd.render = () => {
		if (bkd.data().length == 0) {
			$('#pnl-analysis').html('No data found.')
			return
		}

		// reorder
		if (bkd.breakdownBy() == "customer.channelname") {
			let prev = _.orderBy(bkd.data(), (d) => {
				if (d._id == "General Trade") {
					let mt = bkd.data().find((e) => e._id == "Modern Trade")
					if (toolkit.isDefined(mt)) {
						return mt.PL8A - 10
					}
				}

				return d.PL8A
			}, 'desc')

			let mt = bkd.data().find((e) => e._id == "Modern Trade")
			if (toolkit.isDefined(mt)) {
				mt._id = `Branch Modern Trade`
			}

			let gt = bkd.data().find((e) => e._id == "General Trade")
			if (toolkit.isDefined(gt)) {
				gt._id = `Branch General Trade`
			}


			bkd.data(prev)
		}


		// ========================= TABLE STRUCTURE

		let percentageWidth = 100

		let wrapper = toolkit.newEl('div')
			.addClass('pivot-pnl-branch pivot-pnl')
			.appendTo($('#pnl-analysis'))

		let tableHeaderWrap = toolkit.newEl('div')
			.addClass('table-header')
			.appendTo(wrapper)

		let tableHeader = toolkit.newEl('table')
			.addClass('table')
			.appendTo(tableHeaderWrap)

		let tableContentWrap = toolkit.newEl('div')
			.appendTo(wrapper)
			.addClass('table-content')

		let tableContent = toolkit.newEl('table')
			.addClass('table')
			.appendTo(tableContentWrap)

		let trHeader = toolkit.newEl('tr')
			.appendTo(tableHeader)

		toolkit.newEl('th')
			.html('P&L')
			.css('height', `${rpt.rowHeaderHeight() * bkd.level()}px`)
			.attr('data-rowspan', bkd.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('Total')
			.css('height', `${rpt.rowHeaderHeight() * bkd.level()}px`)
			.attr('data-rowspan', bkd.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header align-right')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('% of N Sales')
			.css('height', `${rpt.rowHeaderHeight() * bkd.level()}px`)
			.css('vertical-align', 'middle')
			.css('font-weight', 'normal')
			.css('font-style', 'italic')
			.width(percentageWidth - 20)
			.attr('data-rowspan', bkd.level())
			.addClass('cell-percentage-header align-right')
			.appendTo(trHeader)

		let trContents = []
		for (let i = 0; i < bkd.level(); i++) {
			trContents.push(toolkit.newEl('tr')
				.appendTo(tableContent)
				.css('height', `${rpt.rowHeaderHeight()}px`))
		}



		// ========================= BUILD HEADER

		let data = bkd.data()

		let columnWidth = 130
		let totalColumnWidth = 0
		let pnlTotalSum = 0
		let dataFlat = []

		let countWidthThenPush = (thheader, each, key) => {
			let currentColumnWidth = each._id.length * ((bkd.breakdownBy() == 'customer.channelname') ? 7 : 10)
			if (currentColumnWidth < columnWidth) {
				currentColumnWidth = columnWidth
			}

			if (each.hasOwnProperty('width')) {
				currentColumnWidth = each.width
			}

			each.key = key.join('_')
			dataFlat.push(each)

			totalColumnWidth += currentColumnWidth
			thheader.width(currentColumnWidth)
		}

		data.forEach((lvl1, i) => {
			let thheader1 = toolkit.newEl('th')
				.html(lvl1._id)
				.attr('colspan', lvl1.count)
				.addClass('align-center')
				.css('border-top', 'none')
				.appendTo(trContents[0])

			if (bkd.level() == 1) {
				countWidthThenPush(thheader1, lvl1, [lvl1._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('% of N Sales')
					.width(percentageWidth)
					.addClass('align-center')
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.css('border-top', 'none')
					.appendTo(trContents[0])

				return
			}
			thheader1.attr('colspan', lvl1.count * 2)

			lvl1.subs.forEach((lvl2, j) => {
				let thheader2 = toolkit.newEl('th')
					.html(lvl2._id)
					.addClass('align-center')
					.appendTo(trContents[1])

				if (bkd.level() == 2) {
					countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

					totalColumnWidth += percentageWidth
					let thheader1p = toolkit.newEl('th')
						.html('% of N Sales')
						.width(percentageWidth)
						.addClass('align-center')
						.css('font-weight', 'normal')
						.css('font-style', 'italic')
						.appendTo(trContents[1])

					return
				}
				thheader2.attr('colspan', lvl2.count)
			})
		})

		tableContent.css('min-width', totalColumnWidth)



		// ========================= CONSTRUCT DATA
		
		let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
		let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */]
		let netSalesPLCode = 'PL8A'
		let netSalesRow = {}
		let grossSalesPLCode = 'PL0'
		let grossSalesRow = {}
		let discountActivityPLCode = 'PL7A'
		let rows = []

		rpt.fixRowValue(dataFlat)

		console.log("dataFlat", dataFlat)

		dataFlat.forEach((e) => {
			let breakdown = e.key
			netSalesRow[breakdown] = e[netSalesPLCode]
			grossSalesRow[breakdown] = e[grossSalesPLCode]
		})

		plmodels.forEach((d) => {
			let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 }
			dataFlat.forEach((e) => {
				let breakdown = e.key
				let value = e[`${d._id}`]; 
				row[breakdown] = value

				if (toolkit.isDefined(e.excludeFromTotal)) {
					return
				}

				row.PNLTotal += value
			})
			dataFlat.forEach((e) => {
				let breakdown = e.key
				let percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100; 
				percentage = toolkit.number(percentage)

				if (d._id == discountActivityPLCode) {
					percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
				} else if (d._id != netSalesPLCode) {
					percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
				}

				if (percentage < 0)
					percentage = percentage * -1

				row[`${breakdown} %`] = percentage
			})

			if (exceptions.indexOf(row.PLCode) > -1) {
				return
			}

			rows.push(row)
		})

		console.log("rows", rows)
		
		let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
		let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
		rows.forEach((d, e) => {
			let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
			if (d.PLCode == discountActivityPLCode) {
				TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
			}

			if (TotalPercentage < 0)
				TotalPercentage = TotalPercentage * -1 
			rows[e].Percentage = toolkit.number(TotalPercentage)
		})




		// ========================= PLOT DATA

		rows.forEach((d, i) => {
			pnlTotalSum += d.PNLTotal

			let PL = d.PLCode
			PL = PL.replace(/\s+/g, '')
			let trHeader = toolkit.newEl('tr')
				.addClass(`header${PL}`)
				.attr(`idheaderpl`, PL)
				.attr(`data-row`, `row-${i}`)
				.css('height', `${rpt.rowContentHeight()}px`)
				.appendTo(tableHeader)

			trHeader.on('click', () => {
				bkd.clickExpand(trHeader)
			})

			toolkit.newEl('td')
				.html('<i></i>' + d.PNL)
				.appendTo(trHeader)

			let pnlTotal = kendo.toString(d.PNLTotal, 'n0')
			toolkit.newEl('td')
				.html(pnlTotal)
				.addClass('align-right')
				.appendTo(trHeader)

			toolkit.newEl('td')
				.html(kendo.toString(d.Percentage, 'n2') + ' %')
				.addClass('align-right')
				.appendTo(trHeader)

			let trContent = toolkit.newEl('tr')
				.addClass(`column${PL}`)
				.attr(`idpl`, PL)
				.attr(`data-row`, `row-${i}`)
				.css('height', `${rpt.rowContentHeight()}px`)
				.appendTo(tableContent)

			dataFlat.forEach((e, f) => {
				let key = e.key
				let value = kendo.toString(d[key], 'n0')
				let percentage = kendo.toString(d[`${key} %`], 'n2') + ' %'

				if ($.trim(value) == '') {
					value = 0
				}

				let cell = toolkit.newEl('td')
					.html(value)
					.addClass('align-right')
					.appendTo(trContent)

				let cellPercentage = toolkit.newEl('td')
					.html(percentage)
					.addClass('align-right')
					.appendTo(trContent)

				$([cell, cellPercentage]).on('click', () => {
					bkd.renderDetail(d.PLCode, e.breakdowns)
				})
			})

			let boolStatus = false
			trContent.find('td').each((a,e) => {
				if ($(e).text() != '0' && $(e).text() != '0.00 %') {
					boolStatus = true
				}
			})

			if (boolStatus) {
				trContent.attr('statusval', 'show')
				trHeader.attr('statusval', 'show')
			} else {
				trContent.attr('statusval', 'hide')
				trHeader.attr('statusval', 'hide')
			}
		})
		

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows)
	}

	bkd.optionBreakdownValues = ko.observableArray([])
	bkd.breakdownValueAll = { _id: 'All', Name: 'All' }
	bkd.changeBreakdown = () => {
		let all = bkd.breakdownValueAll
		let map = (arr) => arr.map((d) => {
			if ("customer.channelname" == bkd.breakdownBy()) {
				return d
			}
			if ("customer.keyaccount" == bkd.breakdownBy()) {
				return { _id: d._id, Name: d._id }
			}

			return { _id: d.Name, Name: d.Name }
		})
		setTimeout(() => {
			bkd.isBreakdownBranch(false)
			bkd.breakdownBranch_Channels([])
			bkd.breakdownBranch_ChannelRDNonRD('')
			bkd.breakdownBranch_SubChannel('')

			bkd.isBreakdownChannel(false)
			// bkd.breakdownChannels([])
			// bkd.breakdownChannelLocation([])

			switch (bkd.breakdownBy()) {
				case "customer.areaname":
					bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
					bkd.breakdownValue([all._id])
				break;
				case "customer.region":
					bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
					bkd.breakdownValue([all._id])
				break;
				case "customer.zone":
					bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
					bkd.breakdownValue([all._id])
				break;
				case "product.brand":
					bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
					bkd.breakdownValue([all._id])
				break;
				case "customer.branchname":
					bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
					bkd.breakdownValue([all._id])

					// bkd.isBreakdownBranch(true)
				break;
				case "customer.channelname":
					bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
					bkd.breakdownValue([all._id])

					bkd.isBreakdownChannel(true)
					bkd.breakdownChannels([])
				break;
				case "customer.keyaccount":
					bkd.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
					bkd.breakdownValue([all._id])
				break;
			}
		}, 100)
	}
	bkd.changeBreakdownValue = () => {
		let all = bkd.breakdownValueAll
		setTimeout(() => {
			let condA1 = bkd.breakdownValue().length == 2
			let condA2 = bkd.breakdownValue().indexOf(all._id) == 0
			if (condA1 && condA2) {
				bkd.breakdownValue.remove(all._id)
				return
			}

			let condB1 = bkd.breakdownValue().length > 1
			let condB2 = bkd.breakdownValue().reverse()[0] == all._id
			if (condB1 && condB2) {
				bkd.breakdownValue([all._id])
				return
			}

			let condC1 = bkd.breakdownValue().length == 0
			if (condC1) {
				bkd.breakdownValue([all._id])
			}
		}, 100)
	}
})()





viewModel.RDvsBranchView2 = {}
let v2 = viewModel.RDvsBranchView2

;(() => {
	let colors = ['rgb(17, 134, 212)', 'rgb(32, 162, 87)', 'rgb(234, 144, 0)']

	v2.contentIsLoading = ko.observable(false)

	v2.breakdownBy = ko.observable('customer.channelname')
	v2.breakdownByFiscalYear = ko.observable('date.fiscal')

	v2.data = ko.observableArray([])
	v2.fiscalYear = ko.observable(rpt.value.FiscalYear())
	v2.level = ko.observable(2)

	v2.refresh = (useCache = false) => {
		$('.breakdown-view:not(.grid-breakdown-channel)').empty()

		let param = {}
		param.pls = []
		param.groups = rpt.parseGroups([v2.breakdownBy()])
		param.aggr = 'sum'
		param.flag = 'branch-vs-rd-only-mt-gt'
		param.filters = rpt.getFilterValue(false, v2.fiscalYear)

		v2.contentIsLoading(true)

		let fetch = () => {
			toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
				if (res.Status == "NOK") {
					setTimeout(() => {
						fetch()
					}, 1000 * 5)
					return
				}

				if (rpt.isEmptyData(res)) {
					v2.contentIsLoading(false)
					return
				}

				v2.data(v2.buildStructure(res.Data.Data))
				rpt.plmodels(res.Data.PLModels)
				v2.emptyGrid()
				v2.contentIsLoading(false)
				v2.render()
				rpt.prepareEvents()
			}, () => {
				v2.emptyGrid()
				v2.contentIsLoading(false)
			})
		}

		fetch()
	}

	v2.clickExpand = (e) => {
		let right = $(e).find('i.fa-chevron-right').length
		let down = $(e).find('i.fa-chevron-down').length
		if (right > 0){
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '530px')
				$('.pivot-pnl .table-content').css('margin-left', '530px')
			}

			$(e).find('i').removeClass('fa-chevron-right')
			$(e).find('i').addClass('fa-chevron-down')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[statusvaltemp=hide]`).css('display', 'none')
			rpt.refreshHeight(e.attr('idheaderpl'))
		}
		if (down > 0) {
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '')
				$('.pivot-pnl .table-content').css('margin-left', '')
			}
			
			$(e).find('i').removeClass('fa-chevron-down')
			$(e).find('i').addClass('fa-chevron-right')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			rpt.hideAllChild(e.attr('idheaderpl'))
		}
	}

	v2.emptyGrid = () => {
		$('.grid-breakdown-channel').replaceWith(`<div class="breakdown-view ez grid-breakdown-channel"></div>`)
	}

	v2.buildStructure = (data) => {
		let groupThenMap = (data, group) => {
			let op1 = _.groupBy(data, (d) => group(d))
			let op2 = _.map(op1, (v, k) => {
				let key = { _id: k, subs: v }
				let sample = v[0]

				for (let prop in sample) {
					if (sample.hasOwnProperty(prop) && prop != '_id') {
						key[prop] = toolkit.sum(v, (d) => d[prop])
					}
				}

				return key
			})

			return op2
		}

		let parsed = groupThenMap(data, (d) => {
			return d._id._id_customer_channelname
		}).map((d) => {
			let subs = groupThenMap(d.subs, (e) => {
				return e._id._id_branchrd
			}).map((e) => {
				if (d._id == 'Total') {
					e.excludeFromTotal = true
				}

				e.breakdowns = e.subs[0]._id
				e.count = 1
				return e
			})

			d.subs = _.orderBy(subs, (e) => e._id, 'asc')
			d.breakdowns = d.subs[0]._id
			d.count = d.subs.length

			let total = {}
			total._id = 'Total'
			total.key = 'Total'
			total.excludeFromTotal = true

			for (let prop in subs[0]) if (subs[0].hasOwnProperty(prop) && (prop.search('PL') > -1)) {
				let val = subs[0][prop]
				total[prop] = toolkit.sum(subs, (f) => f[prop])
			}

			d.subs = [total].concat(d.subs)
			d.count++

			return d
		})

		console.log('------>>>>-------', parsed)

		v2.level(2)
		let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
		return newParsed
	}

	v2.render = () => {
		let container = $('.grid-breakdown-channel')
		if (v2.data().length == 0) {
			container.html('No data found.')
			return
		}


		// ========================= TABLE STRUCTURE

		let wrapper = toolkit.newEl('div')
			.addClass('pivot-pnl-branch pivot-pnl')
			.appendTo(container)

		let tableHeaderWrap = toolkit.newEl('div')
			.addClass('table-header')
			.appendTo(wrapper)

		let tableHeader = toolkit.newEl('table')
			.addClass('table')
			.appendTo(tableHeaderWrap)

		let tableContentWrap = toolkit.newEl('div')
			.appendTo(wrapper)
			.addClass('table-content')

		let tableContent = toolkit.newEl('table')
			.addClass('table')
			.appendTo(tableContentWrap)

		let trHeader = toolkit.newEl('tr')
			.appendTo(tableHeader)

		toolkit.newEl('th')
			.html('P&L')
			.css('height', `${rpt.rowHeaderHeight() * v2.level()}px`)
			.attr('data-rowspan', v2.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('Total')
			.css('height', `${rpt.rowHeaderHeight() * v2.level()}px`)
			.attr('data-rowspan', v2.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header align-right')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('% of N Sales')
			.css('height', `${rpt.rowHeaderHeight() * v2.level()}px`)
			.css('vertical-align', 'middle')
			.css('font-weight', 'normal')
			.css('font-style', 'italic')
			.width(percentageWidth - 20)
			.attr('data-rowspan', v2.level())
			.appendTo(trHeader)

		let trContents = []
		for (let i = 0; i < v2.level(); i++) {
			trContents.push(toolkit.newEl('tr')
				.appendTo(tableContent)
				.css('height', `${rpt.rowHeaderHeight()}px`))
		}



		// ========================= BUILD HEADER

		let data = v2.data()

		let columnWidth = 120
		let totalColumnWidth = 0
		let pnlTotalSum = 0
		let dataFlat = []
		let percentageWidth = 100

		let countWidthThenPush = (thheader, each, key) => {
			let currentColumnWidth = columnWidth

			each.key = key.join('_')
			dataFlat.push(each)

			totalColumnWidth += currentColumnWidth
			thheader.width(currentColumnWidth)
		}

		data.forEach((lvl1, i) => {
			let thheader1 = toolkit.newEl('th')
				.html(lvl1._id)
				.attr('colspan', lvl1.count)
				.addClass('align-center')
				.appendTo(trContents[0])
				.css('background-color', colors[i])
				.css('color', 'white')
				.css('border-top', 'none')

			if (v2.level() == 1) {
				countWidthThenPush(thheader1, lvl1, [lvl1._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('% of N Sales')
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.width(percentageWidth)
					.addClass('align-center')
					.appendTo(trContents[0])
					.css('border-top', 'none')

				return
			}
			thheader1.attr('colspan', lvl1.count * 2)

			lvl1.subs.forEach((lvl2, j) => {
				let thheader2 = toolkit.newEl('th')
					.html(lvl2._id)
					.addClass('align-center')
					.appendTo(trContents[1])

				if (lvl2._id == 'Total') {
					thheader2.css('background-color', 'rgb(116, 149, 160)')
					thheader2.css('color', 'white')
				}

				if (v2.level() == 2) {
					countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

					totalColumnWidth += percentageWidth
					let thheader1p = toolkit.newEl('th')
						.html('% of N Sales')
						.css('font-weight', 'normal')
						.css('font-style', 'italic')
						.width(percentageWidth)
						.addClass('align-center')
						.appendTo(trContents[1])

					if (lvl2._id == 'Total') {
						thheader1p.css('background-color', 'rgb(116, 149, 160)')
						thheader1p.css('color', 'white')
					}

					return
				}
				thheader2.attr('colspan', lvl2.count)
			})
		})

		tableContent.css('width', totalColumnWidth)



		// ========================= CONSTRUCT DATA
		
		let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
		let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */]
		let netSalesPLCode = 'PL8A'
		let netSalesRow = {}
		let grossSalesPLCode = 'PL0'
		let grossSalesRow = {}
		let discountActivityPLCode = 'PL7A'
		let rows = []

		rpt.fixRowValue(dataFlat)

		console.log("dataFlat", dataFlat)

		dataFlat.forEach((e) => {
			let breakdown = e.key
			netSalesRow[breakdown] = e[netSalesPLCode]
			grossSalesRow[breakdown] = e[grossSalesPLCode]
		})

		plmodels.forEach((d) => {
			let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 }
			dataFlat.forEach((e) => {
				let breakdown = e.key
				let value = e[`${d._id}`]; 
				row[breakdown] = value

				if (toolkit.isDefined(e.excludeFromTotal)) {
					return
				}

				row.PNLTotal += value
			})
			dataFlat.forEach((e) => {
				let breakdown = e.key
				let percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100; 
				percentage = toolkit.number(percentage)

				if (d._id == discountActivityPLCode) {
					percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
				} else if (d._id != netSalesPLCode) {
					percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
				}

				if (percentage < 0)
					percentage = percentage * -1

				row[`${breakdown} %`] = percentage
			})

			if (exceptions.indexOf(row.PLCode) > -1) {
				return
			}

			rows.push(row)
		})

		console.log("rows", rows)
		
		let grossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode })
		let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
		let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
		rows.forEach((d, e) => {
			let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
			if (d.PLCode == discountActivityPLCode) {
				TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100

				// ====== hek MODERN TRADE numbah
				let grossSalesRedisMT = grossSales[`Modern Trade_Regional Distributor`]
				let grossSalesRedisGT = grossSales[`Modern Trade_Regional Distributor`]

				let discountBranchMTpercent = d[`Modern Trade_Branch %`]
				let discountRedisMTCalculated = toolkit.valueXPercent(grossSalesRedisMT, discountBranchMTpercent)
				let discountRedisTotal = d[`General Trade_Total`]
				let discountRedisGTCalculated = discountRedisTotal - discountRedisMTCalculated
				let discountRedisGTPercentCalculated = toolkit.number(discountRedisGTCalculated / grossSalesRedisGT) * 100

				d[`Modern Trade_Regional Distributor`] = discountRedisMTCalculated
				d[`Modern Trade_Regional Distributor %`] = discountBranchMTpercent

				d[`General Trade_Regional Distributor`] = discountRedisGTCalculated
				d[`General Trade_Regional Distributor %`] = discountRedisGTPercentCalculated
				
			}

			if (TotalPercentage < 0)
				TotalPercentage = TotalPercentage * -1 
			d.Percentage = toolkit.number(TotalPercentage)

			// ===== ABS %

			for (let p in d) if (d.hasOwnProperty(p)) {
				if (p.indexOf('%') > -1 || p == "Percentage") {
					d[p] = Math.abs(d[p])
				}
			}
		})




		// ========================= PLOT DATA

		rows.forEach((d, i) => {
			pnlTotalSum += d.PNLTotal

			let PL = d.PLCode
			PL = PL.replace(/\s+/g, '')
			let trHeader = toolkit.newEl('tr')
				.addClass(`header${PL}`)
				.attr(`idheaderpl`, PL)
				.attr(`data-row`, `row-${i}`)
				.appendTo(tableHeader)
				.css('height', `${rpt.rowContentHeight()}px`)

			trHeader.on('click', () => {
				v2.clickExpand(trHeader)
			})

			toolkit.newEl('td')
				.html('<i></i>' + d.PNL)
				.appendTo(trHeader)

			let pnlTotal = kendo.toString(d.PNLTotal, 'n0')
			toolkit.newEl('td')
				.html(pnlTotal)
				.addClass('align-right')
				.appendTo(trHeader)

			toolkit.newEl('td')
				.html(kendo.toString(d.Percentage, 'n2') + ' %')
				.addClass('align-right')
				.appendTo(trHeader)

			let trContent = toolkit.newEl('tr')
				.addClass(`column${PL}`)
				.attr(`idpl`, PL)
				.attr(`data-row`, `row-${i}`)
				.css('height', `${rpt.rowContentHeight()}px`)
				.appendTo(tableContent)

			dataFlat.forEach((e, f) => {
				let key = e.key
				let value = kendo.toString(d[key], 'n0')
				let percentage = kendo.toString(d[`${key} %`], 'n2') + ' %'

				if ($.trim(value) == '') {
					value = 0
				}

				let cell = toolkit.newEl('td')
					.html(value)
					.addClass('align-right')
					.appendTo(trContent)

				let cellPercentage = toolkit.newEl('td')
					.html(percentage)
					.addClass('align-right')
					.appendTo(trContent)
			})

			let boolStatus = false
			trContent.find('td').each((a,e) => {
				if ($(e).text() != '0' && $(e).text() != '0.00 %') {
					boolStatus = true
				}
			})

			if (boolStatus) {
				trContent.attr('statusval', 'show')
				trHeader.attr('statusval', 'show')
			} else {
				trContent.attr('statusval', 'hide')
				trHeader.attr('statusval', 'hide')
			}
		})
		

		// ========================= CONFIGURE THE HIRARCHY
		v2.buildGridLevels(container, rows)
	}

	v2.buildGridLevels = (container, rows) => {
		let grouppl1 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader1}), (k , v) => { return { data: k, key:v}})
		let grouppl2 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader2}), (k , v) => { return { data: k, key:v}})
		let grouppl3 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader3}), (k , v) => { return { data: k, key:v}})

		let $trElem, $columnElem
		let resg1, resg2, resg3, PLyo, PLyo2, child = 0, parenttr = 0, textPL
		container.find(".table-header tbody>tr").each(function( i ) {
			if (i > 0){
				$trElem = $(this)
				resg1 = _.find(grouppl1, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
				resg2 = _.find(grouppl2, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
				resg3 = _.find(grouppl3, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })

				let idplyo = _.find(rpt.idarrayhide(), (a) => { return a == $trElem.attr("idheaderpl") })
				if (idplyo != undefined){
					$trElem.remove()
					container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).remove()
				}
				if (resg1 == undefined && idplyo2 == undefined){
					if (resg2 != undefined){ 
						textPL = _.find(resg2.data, function(o) { return o._id == $trElem.attr("idheaderpl") })
						PLyo = _.find(rows, function(o) { return o.PNL == textPL.PLHeader1 })
						PLyo2 = _.find(rows, function(o) { return o.PLCode == textPL._id })
						$trElem.find('td:eq(0)').css('padding-left','40px')
						$trElem.attr('idparent', PLyo.PLCode)
						child = container.find(`tr[idparent=${PLyo.PLCode}]`).length
						$columnElem = container.find(`.table-content tr.column${PLyo2.PLCode}`)
						$columnElem.attr('idcontparent', PLyo.PLCode)
						let PLCodeChange = rpt.changeParent($trElem, $columnElem, $columnElem.attr('idpl'))
						if (PLCodeChange != "")
							PLyo.PLCode = PLCodeChange
						if (child > 1){
							let $parenttr = container.find(`tr[idheaderpl=${PLyo.PLCode}]`)
							let $parenttrcontent = container.find(`tr[idpl=${PLyo.PLCode}]`)
							// $trElem.insertAfter($(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							// $columnElem.insertAfter($(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							$trElem.insertAfter($parenttr)
							$columnElem.insertAfter($parenttrcontent)
						}
						else{
							$trElem.insertAfter(container.find(`tr.header${PLyo.PLCode}`))
							$columnElem.insertAfter(container.find(`tr.column${PLyo.PLCode}`))
						}
					} else if (resg2 == undefined){
						if (resg3 != undefined){
							PLyo = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader2 })
							PLyo2 = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader3 })
							$trElem.find('td:eq(0)').css('padding-left','70px')
							if (PLyo == undefined){
								PLyo = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader1 })
								if(PLyo != undefined)
									$trElem.find('td:eq(0)').css('padding-left','40px')
							}
							$trElem.attr('idparent', PLyo.PLCode)
							child = container.find(`tr[idparent=${PLyo.PLCode}]`).length
							$columnElem = container.find(`.table-content tr.column${PLyo2.PLCode}`)
							$columnElem.attr('idcontparent', PLyo.PLCode)
							let PLCodeChange = rpt.changeParent($trElem, $columnElem, $columnElem.attr('idpl'))
							if (PLCodeChange != "")
								PLyo.PLCode = PLCodeChange
							if (child > 1){
								let $parenttr = container.find(`tr[idheaderpl=${PLyo.PLCode}]`)
								let $parenttrcontent = container.find(`tr[idpl=${PLyo.PLCode}]`)
								// $trElem.insertAfter(container.find(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
								// $columnElem.insertAfter(container.find(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
								$trElem.insertAfter($parenttr)
								$columnElem.insertAfter($parenttrcontent)
							}
							else{
								$trElem.insertAfter(container.find(`tr.header${PLyo.PLCode}`))
								$columnElem.insertAfter(container.find(`tr.column${PLyo.PLCode}`))
							}
						}
					}
				}

				let idplyo2 = _.find(rpt.idarrayhide(), (a) => { return a == $trElem.attr("idparent") })
				if (idplyo2 != undefined){
					$trElem.removeAttr('idparent')
					$trElem.addClass('bold')
					$trElem.css('display','inline-grid')
					container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).removeAttr("idcontparent")
					container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).attr('statusval', 'show')
					container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).attr('statusvaltemp', 'show')
					container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).css('display','inline-grid')
				}
			}
		})

		let countChild = ''
		container.find(".table-header tbody>tr").each(function( i ) {
			$trElem = container.find(this)
			parenttr = container.find(`tr[idparent=${$trElem.attr('idheaderpl')}]`).length
			if (parenttr>0){
				$trElem.addClass('dd')
				$trElem.find(`td:eq(0)>i`)
					.addClass('fa fa-chevron-right')
					.css('margin-right', '5px')
				container.find(`tr[idparent=${$trElem.attr('idheaderpl')}]`).css('display', 'none')
				container.find(`tr[idcontparent=${$trElem.attr('idheaderpl')}]`).css('display', 'none')
				container.find(`tr[idparent=${$trElem.attr('idheaderpl')}]`).each((a,e) => {
					if (container.find(e).attr('statusval') == 'show'){
						container.find(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).attr('statusval', 'show')
						container.find(`tr[idpl=${$trElem.attr('idheaderpl')}]`).attr('statusval', 'show')
						if (container.find(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).attr('idparent') == undefined) {
							container.find(`tr[idpl=${$trElem.attr('idheaderpl')}]`).css('display', '')
							container.find(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).css('display', '')
						}
					}
				})
			} else {
				countChild = $trElem.attr('idparent')
				if (countChild == '' || countChild == undefined)
					$trElem.find(`td:eq(0)`).css('padding-left', '20px')
			}
		})

		rpt.showZeroValue(false)
		container.find(".table-header tr:not([idparent]):not([idcontparent])").addClass('bold')
		rpt.refreshHeight()
		rpt.addScrollBottom(container)
	}
})()





vm.currentMenu('P&L Performance')
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: 'P&L Performance', href: '#' }
])

bkd.title('P&L by Channels')

rpt.refresh = () => {
	bkd.changeBreakdown()
	setTimeout(() => {
		bkd.breakdownValue(['All'])
		bkd.refresh(false)
	}, 200)
}

$(() => {
	rpt.refresh()
	// v2.refresh()
})
