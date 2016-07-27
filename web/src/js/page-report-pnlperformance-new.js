viewModel.breakdown = {}
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
			subchan.injectFilters(param.filters)
			rpt.injectMonthQuarterFilter(param.filters)
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

				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
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
		let right = $(e).find('i.fa-chevron-right').length, down = 0
		if (e.attr('idheaderpl') == 'PL0')
			down = $(e).find('i.fa-chevron-up').length
		else
			down = $(e).find('i.fa-chevron-down').length
		if (right > 0){
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
				$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
			}

			$(e).find('i').removeClass('fa-chevron-right')
			if (e.attr('idheaderpl') == 'PL0')
				$(e).find('i').addClass('fa-chevron-up')
			else
				$(e).find('i').addClass('fa-chevron-down')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[statusvaltemp=hide]`).css('display', 'none')
			rpt.refreshHeight(e.attr('idheaderpl'))
			rpt.refreshchildadd(e.attr('idheaderpl'))
		}
		if (down > 0) {
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '')
				$('.pivot-pnl .table-content').css('margin-left', '')
			}
			
			$(e).find('i').removeClass('fa-chevron-up')
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
				return rpt.orderByChannel(d._id, d.PL8A)
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
			subchan.injectFilters(param.filters)
			rpt.injectMonthQuarterFilter(param.filters)
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
				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
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
		let right = $(e).find('i.fa-chevron-right').length, down = 0
		if (e.attr('idheaderpl') == 'PL0')
			down = $(e).find('i.fa-chevron-up').length
		else
			down = $(e).find('i.fa-chevron-down').length
		if (right > 0){
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
				$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
			}

			$(e).find('i').removeClass('fa-chevron-right')
			if (e.attr('idheaderpl') == 'PL0')
				$(e).find('i').addClass('fa-chevron-up')
			else
				$(e).find('i').addClass('fa-chevron-down')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[statusvaltemp=hide]`).css('display', 'none')
			rpt.refreshHeight(e.attr('idheaderpl'))
			rpt.refreshchildadd(e.attr('idheaderpl'))
		}
		if (down > 0) {
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '')
				$('.pivot-pnl .table-content').css('margin-left', '')
			}
			
			$(e).find('i').removeClass('fa-chevron-up')
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

			totalColumnWidth += currentColumnWidth + percentageWidth
			thheader.width(currentColumnWidth)
		}

		data.forEach((lvl1, i) => {
			let thheader1 = toolkit.newEl('th')
				.html(lvl1._id.replace(/\ /g, '&nbsp;'))
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
					.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
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
					.html(lvl2._id.replace(/\ /g, '&nbsp;'))
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
						.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
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

				// // ====== hek MODERN TRADE numbah
				// let grossSalesRedisMT = grossSales[`Modern Trade_Regional Distributor`]
				// let grossSalesRedisGT = grossSales[`Modern Trade_Regional Distributor`]

				// let discountBranchMTpercent = d[`Modern Trade_Branch %`]
				// let discountRedisMTCalculated = toolkit.valueXPercent(grossSalesRedisMT, discountBranchMTpercent)
				// let discountRedisTotal = d[`General Trade_Total`]
				// let discountRedisGTCalculated = discountRedisTotal - discountRedisMTCalculated
				// let discountRedisGTPercentCalculated = toolkit.number(discountRedisGTCalculated / grossSalesRedisGT) * 100

				// d[`Modern Trade_Regional Distributor`] = discountRedisMTCalculated
				// d[`Modern Trade_Regional Distributor %`] = discountBranchMTpercent

				// d[`General Trade_Regional Distributor`] = discountRedisGTCalculated
				// d[`General Trade_Regional Distributor %`] = discountRedisGTPercentCalculated
				
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
								// $trElem.insertAfter(container.find(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
								// $columnElem.insertAfter(container.find(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
								$trElem.insertAfter(container.find(`tr[idheaderpl=${PLyo.PLCode}]`))
								$columnElem.insertAfter(container.find(`tr[idpl=${PLyo.PLCode}]`))
							}
							else{
								$trElem.insertAfter(container.find(`tr.header${PLyo.PLCode}`))
								$columnElem.insertAfter(container.find(`tr.column${PLyo.PLCode}`))
							}
							if ($trElem.attr('idparent') == "PL33" || $trElem.attr('idparent') == "PL34" || $trElem.attr('idparent') == "PL35"){
								let texthtml = $trElem.find('td:eq(0)').text()
								$trElem.find('td:eq(0)').text(texthtml.substring(5,texthtml.length))
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







viewModel.RDvsBranchView1 = {}
let v1 = viewModel.RDvsBranchView1

;(() => {
	let colors = ['rgb(17, 134, 212)', 'rgb(32, 162, 87)', 'rgb(234, 144, 0)']

	v1.contentIsLoading = ko.observable(false)
	v1.mode = ko.observable('branch')

	v1.breakdownBy = ko.observable('customer.channelname')
	v1.breakdownByFiscalYear = ko.observable('date.fiscal')

	v1.data = ko.observableArray([])
	v1.fiscalYear = ko.observable(rpt.value.FiscalYear())
	v1.level = ko.observable(2)
	v1.title = ko.observable('Total Branch & RD')

	v1.changeTo = (d,e) => {
		v1.title(d)
		$(window).trigger('scroll')
	}

	v1.refresh = (useCache = false) => {
		$('.breakdown-view:not(.grid-breakdown-branch-rd)').empty()

		let param = {}
		param.pls = []
		param.groups = rpt.parseGroups([v1.breakdownBy()])
		param.aggr = 'sum'
		param.flag = 'branch-vs-rd'
		param.filters = rpt.getFilterValue(false, v1.fiscalYear)

		v1.contentIsLoading(true)

		let fetch = () => {
			subchan.injectFilters(param.filters)
			rpt.injectMonthQuarterFilter(param.filters)
			toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
				if (res.Status == "NOK") {
					setTimeout(() => {
						fetch()
					}, 1000 * 5)
					return
				}

				if (rpt.isEmptyData(res)) {
					v1.contentIsLoading(false)
					return
				}

				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
				v1.data(v1.buildStructure(res.Data.Data))
				rpt.plmodels(res.Data.PLModels)
				v1.emptyGrid()
				v1.contentIsLoading(false)
				v1.render()
				rpt.prepareEvents()
			}, () => {
				v1.emptyGrid()
				v1.contentIsLoading(false)
			})
		}

		fetch()
	}

	v1.clickExpand = (e) => {
		let right = $(e).find('i.fa-chevron-right').length, down = 0
		if (e.attr('idheaderpl') == 'PL0')
			down = $(e).find('i.fa-chevron-up').length
		else
			down = $(e).find('i.fa-chevron-down').length
		if (right > 0){
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
				$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
			}

			$(e).find('i').removeClass('fa-chevron-right')
			if (e.attr('idheaderpl') == 'PL0')
				$(e).find('i').addClass('fa-chevron-up')
			else
				$(e).find('i').addClass('fa-chevron-down')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[statusvaltemp=hide]`).css('display', 'none')
			rpt.refreshHeight(e.attr('idheaderpl'))
			rpt.refreshchildadd(e.attr('idheaderpl'))
		}
		if (down > 0) {
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '')
				$('.pivot-pnl .table-content').css('margin-left', '')
			}
			
			$(e).find('i').removeClass('fa-chevron-up')
			$(e).find('i').removeClass('fa-chevron-down')
			$(e).find('i').addClass('fa-chevron-right')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			rpt.hideAllChild(e.attr('idheaderpl'))
		}
	}

	v1.emptyGrid = () => {
		$('.grid-breakdown-branch-rd').replaceWith(`<div class="breakdown-view ez grid-breakdown-branch-rd"></div>`)
	}

	v1.buildStructure = (data) => {
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
			return d._id._id_branchrd
		}).map((d) => {
			let subs = groupThenMap(d.subs, (e) => {
				return e._id._id_customer_channelname
			}).map((e) => {
				e.breakdowns = e.subs[0]._id
				d.count = 1
				return e
			})

			d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
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
			// d.count++

			return d
		})

		v1.level(2)
		let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
		return newParsed
	}

	v1.render = () => {
		let container = $('.grid-breakdown-branch-rd')
		if (v1.data().length == 0) {
			container.html('No data found.')
			return
		}


		// ========================= TABLE STRUCTURE

		let percentageWidth = 100

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
			.css('height', `${rpt.rowHeaderHeight() * v1.level()}px`)
			.attr('data-rowspan', v1.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('Total')
			.css('height', `${rpt.rowHeaderHeight() * v1.level()}px`)
			.attr('data-rowspan', v1.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header align-right')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('% of N Sales')
			.css('height', `${rpt.rowHeaderHeight() * v1.level()}px`)
			.css('vertical-align', 'middle')
			.css('font-weight', 'normal')
			.css('font-style', 'italic')
			.width(percentageWidth - 20)
			.attr('data-rowspan', v1.level())
			.css('vertical-align', 'middle')
			.appendTo(trHeader)

		let trContents = []
		for (let i = 0; i < v1.level(); i++) {
			trContents.push(toolkit.newEl('tr')
				.appendTo(tableContent)
				.css('height', `${rpt.rowHeaderHeight()}px`))
		}



		// ========================= BUILD HEADER

		let data = v1.data()

		let columnWidth = 140
		let totalColumnWidth = 0
		let pnlTotalSum = 0
		let dataFlat = []

		let countWidthThenPush = (thheader, each, key) => {
			let currentColumnWidth = columnWidth

			each.key = key.join('_')
			dataFlat.push(each)

			totalColumnWidth += currentColumnWidth
			thheader.width(currentColumnWidth)
		}

	data.filter((d) => d._id != v1.mode())
		.forEach((lvl1, i) => {
			lvl1.subs.forEach((lvl2, j) => {
				let each = lvl2
				let key = [lvl1._id, lvl2._id]

				each.key = key.join('_')
				dataFlat.push(each)
			})
		})

	data.filter((d) => d._id == v1.mode())
		.forEach((lvl1, i) => {
			let thheader1 = toolkit.newEl('th')
				.html(lvl1._id)
				.attr('colspan', lvl1.count)
				.addClass('align-center')
				.appendTo(trContents[0])
				.css('border-top', 'none')

			if (v1.level() == 1) {
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

				if (lvl2._id != 'Total') {
					thheader2.appendTo(trContents[1])
				}

				if (v1.level() == 2) {
					countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

					totalColumnWidth += percentageWidth
					let thheader1p = toolkit.newEl('th')
						.html('% of N Sales')
						.css('font-weight', 'normal')
						.css('font-style', 'italic')
						.width(percentageWidth)
						.addClass('align-center')

					if (lvl2._id != 'Total') {
						thheader1p.appendTo(trContents[1])
					}

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
				} else if (d._id == netSalesPLCode) {
					percentage = 100
				} else {
					percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
				} 

				row[`${breakdown} %`] = percentage
			})

			if (exceptions.indexOf(row.PLCode) > -1) {
				return
			}

			rows.push(row)
		})

		console.log("rows", rows)

		rows.forEach((d) => {
			d.PNLTotal = 0

			for (let p in d) if (d.hasOwnProperty(p) && p.split('_')[0] == v1.mode() && p.toLowerCase().indexOf('total') == -1) {
				d.PNLTotal += d[p]
			}
		})

		let grossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode })
		let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
		let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
		rows.forEach((d, e) => {
			let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
			if (d.PLCode == discountActivityPLCode) {
				TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100

				// // ====== hek MODERN TRADE numbah
				// let grossSalesRedisMT = grossSales[`Regional Distributor_Modern Trade`]
				// let grossSalesRedisGT = grossSales[`Regional Distributor_Modern Trade`]

				// let discountBranchMTpercent = d[`Branch_Modern Trade %`]
				// let discountRedisMTCalculated = toolkit.valueXPercent(grossSalesRedisMT, discountBranchMTpercent)
				// let discountRedisTotal = d[`Regional Distributor_Total`]
				// let discountRedisGTCalculated = discountRedisTotal - discountRedisMTCalculated
				// let discountRedisGTPercentCalculated = toolkit.number(discountRedisGTCalculated / grossSalesRedisGT) * 100

				// d[`Regional Distributor_Modern Trade`] = discountRedisMTCalculated
				// d[`Regional Distributor_Modern Trade %`] = discountBranchMTpercent

				// d[`Regional Distributor_General Trade`] = discountRedisGTCalculated
				// d[`Regional Distributor_General Trade %`] = discountRedisGTPercentCalculated
				
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
				.css('height', `${rpt.rowContentHeight()}px`)
				.appendTo(tableHeader)

			trHeader.on('click', () => {
				v1.clickExpand(trHeader)
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

		dataFlat
			.filter((g) => g.key.split('_')[0] == v1.mode())
			.forEach((e, f) => {
				if (e._id == 'Total') {
					return
				}

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
})()






viewModel.keyAccount = new Object()
let kac = viewModel.keyAccount

;(() => {
	kac.contentIsLoading = ko.observable(false)
	kac.popupIsLoading = ko.observable(false)
	kac.title = ko.observable('Key Account Analysis')
	kac.detail = ko.observableArray([])
	kac.limit = ko.observable(10)
	kac.breakdownNote = ko.observable('')

	kac.breakdownBy = ko.observable('customer.customergroupname')
	kac.breakdownByFiscalYear = ko.observable('date.fiscal')
	kac.oldBreakdownBy = ko.observable(kac.breakdownBy())

	kac.data = ko.observableArray([])
	kac.fiscalYear = ko.observable(rpt.value.FiscalYear())
	kac.breakdownValue = ko.observableArray([])
	kac.breakdownChannelValue = ko.observableArray([])
	kac.breakdownGroupValue = ko.observableArray([])

	kac.refresh = (useCache = false) => {
		$('.breakdown-view:not(#key-account-analysis)').empty()

		if (kac.breakdownValue().length == 0) {
			toolkit.showError('Please choose at least breakdown value')
			return
		}

		let breakdownKeyAccount = 'customer.keyaccount',
			breakdownKeyChannel = 'customer.channelname',
			breakdownTransactionSource = 'trxsrc'

		let param = {}
		param.pls = []
		param.groups = rpt.parseGroups([kac.breakdownBy(), breakdownKeyAccount, breakdownKeyChannel, breakdownTransactionSource])
		param.aggr = 'sum'
		param.filters = rpt.getFilterValue(false, kac.fiscalYear)
		
		param.filters.push({
			Field: "customer.channelname",
			Op: "$in",
			Value: ['I3']
			// Value: rpt.masterData.Channel()
			// 	.map((d) => d._id)
			// 	.filter((d) => d != "EXP")
		})

		let breakdownGroupValue = kac.breakdownGroupValue().filter((d) => d != 'All')
		if (breakdownGroupValue.length > 0) {
			param.filters.push({
				Field: breakdownKeyAccount,
				Op: '$in',
				Value: kac.breakdownGroupValue()
			})
		}

		let breakdownValue = kac.breakdownValue().filter((d) => d != 'All')
		if (breakdownValue.length > 0) {
			param.filters.push({
				Field: kac.breakdownBy(),
				Op: '$in',
				Value: kac.breakdownValue()
			})
		}

		let breakdownChannel = kac.breakdownChannelValue().filter((d) => d != 'All')
		if (breakdownChannel.length > 0) {
			param.filters.push({
				Field: breakdownKeyChannel,
				Op: '$in',
				Value: kac.breakdownChannelValue()
			})
		}
		console.log("bdk", param.filters)
		
		kac.oldBreakdownBy(kac.breakdownBy())
		kac.contentIsLoading(true)

		let fetch = () => {
			subchan.injectFilters(param.filters)
			rpt.injectMonthQuarterFilter(param.filters)
			toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
				if (res.Status == "NOK") {
					setTimeout(() => {
						fetch()
					}, 1000 * 5)
					return
				}

				if (rpt.isEmptyData(res)) {
					kac.contentIsLoading(false)
					return
				}

				let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
				kac.breakdownNote(`Last refreshed on: ${date}`)

				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
				kac.data(kac.buildStructure(res.Data.Data))
				rpt.plmodels(res.Data.PLModels)
				kac.emptyGrid()
				kac.contentIsLoading(false)
				kac.render()
				rpt.prepareEvents()
			}, () => {
				kac.emptyGrid()
				kac.contentIsLoading(false)
			}, {
				cache: (useCache == true) ? 'breakdown chart' : false
			})
		}

		fetch()
	}

	kac.clickExpand = (e) => {
		let right = $(e).find('i.fa-chevron-right').length, down = 0
		if (e.attr('idheaderpl') == 'PL0')
			down = $(e).find('i.fa-chevron-up').length
		else
			down = $(e).find('i.fa-chevron-down').length
		if (right > 0){
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
				$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
			}
			
			$(e).find('i').removeClass('fa-chevron-right')
			if (e.attr('idheaderpl') == 'PL0')
				$(e).find('i').addClass('fa-chevron-up')
			else
				$(e).find('i').addClass('fa-chevron-down')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[statusvaltemp=hide]`).css('display', 'none')
			rpt.refreshchildadd(e.attr('idheaderpl'))
		}
		if (down > 0) {
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '')
				$('.pivot-pnl .table-content').css('margin-left', '')
			}
			
			$(e).find('i').removeClass('fa-chevron-up')
			$(e).find('i').removeClass('fa-chevron-down')
			$(e).find('i').addClass('fa-chevron-right')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			rpt.hideAllChild(e.attr('idheaderpl'))
		}
	}
	kac.emptyGrid = () => {
		$('#key-account-analysis').replaceWith(`<div class="breakdown-view ez" id="key-account-analysis"></div>`)
	}

	kac.buildStructure = (data) => {
		data.filter((d) => d._id._id_customer_customergroupname === 'Other')
			.forEach((d) => {
				if (d._id._id_trxsrc == 'VDIST') {
					switch (d._id._id_customer_channelname) {
						case 'General Trade':
						case 'Modern Trade':
							d._id._id_customer_customergroupname = `Other - ${d._id._id_customer_channelname}`
							return
					}
				} else if (d._id._id_trxsrc == 'pushrdreversesbymks') {
					d._id._id_customer_customergroupname = 'Other - Reclass to RD'
					return
				}

				d._id._id_customer_customergroupname = 'Other' 
			})

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
			return d._id[`_id_${toolkit.replace(kac.breakdownBy(), '.', '_')}`]
		}).map((d) => {
			d.breakdowns = d.subs[0]._id
			d.count = 1

			return d
		})

		let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
		return newParsed
	}

	kac.render = () => {
		if (kac.data().length == 0) {
			$('#key-account-analysis').html('No data found.')
			return
		}
		
		let rows = []
		
		let data = kac.data()
		let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
		let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */]
		let netSalesPLCode = 'PL8A'
		let netSalesRow = {}
		let grossSalesPLCode = 'PL0'
		let grossSalesRow = {}
		let discountActivityPLCode = 'PL7A'

		rpt.fixRowValue(data)

		data.forEach((e) => {
			let breakdown = e._id
			netSalesRow[breakdown] = e[netSalesPLCode]
			grossSalesRow[breakdown] = e[grossSalesPLCode]
		})
		data = _.orderBy(data, (d) => {
			if (d._id == 'Other - Modern Trade') {
				return -100000000000
			} else if (d._id == 'Other - General Trade') {
				return -100000000001
			} else if (d._id == 'Other - Reclass to RD') {
				return -100000000002
			} else if (d._id == 'Other') {
				return -100000000003
			}

			return netSalesRow[d._id]
		}, 'desc')

		plmodels.forEach((d) => {
			let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 }
			data.forEach((e) => {
				let breakdown = e._id
				let value = e[`${d._id}`]; 
				value = toolkit.number(value)
				row[breakdown] = value
				row.PNLTotal += value
			})
			data.forEach((e) => {
				let breakdown = e._id
				let percentage = toolkit.number(e[`${d._id}`] / row.PNLTotal) * 100; 
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

		let percentageWidth = 100

		let wrapper = toolkit.newEl('div')
			.addClass('pivot-pnl')
			.appendTo($('#key-account-analysis'))

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

		let trHeader1 = toolkit.newEl('tr')
			.appendTo(tableHeader)

		toolkit.newEl('th')
			.html('P&L')
			.css('height', `${rpt.rowHeaderHeight()}px`)
			.appendTo(trHeader1)

		toolkit.newEl('th')
			.html('Total')
			.css('height', `${rpt.rowHeaderHeight()}px`)
			.addClass('align-right')
			.appendTo(trHeader1)

		toolkit.newEl('th')
			.html('% of N Sales')
			.css('height', `${rpt.rowHeaderHeight()}px`)
			.css('font-weight', 'normal')
			.css('font-style', 'italic')
			.width(percentageWidth - 20)
			.addClass('align-right')
			.appendTo(trHeader1)

		let trContent1 = toolkit.newEl('tr')
			.appendTo(tableContent)

		let colWidth = 160
		let totalWidth = 0
		let pnlTotalSum = 0

		if (kac.breakdownBy() == "customer.branchname") {
			colWidth = 200
		}

		if (kac.breakdownBy() == "customer.region") {
			colWidth = 230
		}

		data.forEach((d, i) => {
			if (d._id.length > 22)
				colWidth += 30
			toolkit.newEl('th')
				.html(d._id)
				.addClass('align-right')
				.appendTo(trContent1)
				.width(colWidth)

			toolkit.newEl('th')
				.html('% of N Sales')
				.css('font-weight', 'normal')
				.css('font-style', 'italic')
				.width(percentageWidth)
				.addClass('align-right cell-percentage')
				.appendTo(trContent1)
				.width(percentageWidth)

			totalWidth += colWidth + percentageWidth
		})
		// console.log('data ', data)

		tableContent.css('min-width', totalWidth)

		// console.log('row ', rows)
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
				kac.clickExpand(trHeader)
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
				.html(kendo.toString(d.Percentage, 'n2') + '%')
				.addClass('align-right')
				.appendTo(trHeader)

			let trContent = toolkit.newEl('tr')
				.addClass(`column${PL}`)
				.attr(`data-row`, `row-${i}`)
				.attr(`idpl`, PL)
				.css('height', `${rpt.rowContentHeight()}px`)
				.appendTo(tableContent)

			data.forEach((e, f) => {
				let key = e._id
				let value = kendo.toString(d[key], 'n0')

				let percentage = kendo.toString(d[`${key} %`], 'n2')

				if ($.trim(value) == '') {
					value = 0
				}

				let cell = toolkit.newEl('td')
					.html(value)
					.addClass('align-right')
					.appendTo(trContent)

				toolkit.newEl('td')
					.html(`${percentage} %`)
					.addClass('align-right cell-percentage')
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

		rpt.buildGridLevels(rows)
	}

	kac.optionBreakdownValues = ko.observableArray([])
	kac.breakdownValueAll = { _id: 'All', Name: 'All' }
	kac.optionBreakdownChannelValues = ko.observableArray([])
	kac.changeBreakdown = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			kac.optionBreakdownValues([all].concat(
				rpt.masterData.CustomerGroup().map((d) => { 
					return { _id: d.Name, Name: d.Name } })
				)
			)
			kac.breakdownValue([all._id])
			kac.optionBreakdownChannelValues([all].concat(rpt.masterData.Channel()))
			kac.breakdownChannelValue([all._id])
		}, 100)
	}
	kac.changeBreakdownValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = kac.breakdownValue().length == 2
			let condA2 = kac.breakdownValue().indexOf(all._id) == 0
			if (condA1 && condA2) {
				kac.breakdownValue.remove(all._id)
				return
			}

			let condB1 = kac.breakdownValue().length > 1
			let condB2 = kac.breakdownValue().reverse()[0] == all._id
			if (condB1 && condB2) {
				kac.breakdownValue([all._id])
				return
			}

			let condC1 = kac.breakdownValue().length == 0
			if (condC1) {
				kac.breakdownValue([all._id])
			}
		}, 100)
	}

	kac.changeBreakdownChannelValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = kac.breakdownChannelValue().length == 2
			let condA2 = kac.breakdownChannelValue().indexOf(all._id) == 0
			if (condA1 && condA2) {
				kac.breakdownChannelValue.remove(all._id)
				return
			}

			let condB1 = kac.breakdownChannelValue().length > 1
			let condB2 = kac.breakdownChannelValue().reverse()[0] == all._id
			if (condB1 && condB2) {
				kac.breakdownChannelValue([all._id])
				return
			}

			let condC1 = kac.breakdownChannelValue().length == 0
			if (condC1) {
				kac.breakdownChannelValue([all._id])
			}
		}, 100)
	}


	kac.optionBreakdownGroupValues = ko.observableArray([])
	kac.changeBreakdownGroup = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			kac.optionBreakdownGroupValues([all].concat(
				rpt.masterData.KeyAccount().map((d) => { 
					let name = `(${d._id}) ${d.Name}`
					if (d.Name == 'OTHER') {
						name = d.Name
					}

					return { _id: d._id, Name: name } })
				)
			)
			kac.breakdownGroupValue([all._id])
		}, 100)
	}
	kac.changeBreakdownGroupValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = kac.breakdownGroupValue().length == 2
			let condA2 = kac.breakdownGroupValue().indexOf(all._id) == 0
			if (condA1 && condA2) {
				kac.breakdownGroupValue.remove(all._id)
				return
			}

			let condB1 = kac.breakdownGroupValue().length > 1
			let condB2 = kac.breakdownGroupValue().reverse()[0] == all._id
			if (condB1 && condB2) {
				kac.breakdownGroupValue([all._id])
				return
			}

			let condC1 = kac.breakdownGroupValue().length == 0
			if (condC1) {
				kac.breakdownGroupValue([all._id])
			}
		}, 100)
	}
})()






viewModel.subChannel = {}
let subchan = viewModel.subChannel

;(() => {
	subchan.contentIsLoading = ko.observable(false)
	subchan.popupIsLoading = ko.observable(false)
	subchan.title = ko.observable('P&L Analytic')
	subchan.detail = ko.observableArray([])
	subchan.limit = ko.observable(10)
	subchan.breakdownNote = ko.observable('')

	subchan.breakdownBy = ko.observable('')
	subchan.breakdownByFiscalYear = ko.observable('date.fiscal')
	subchan.oldBreakdownBy = ko.observable(subchan.breakdownBy())

	subchan.data = ko.observableArray([])
	subchan.fiscalYear = ko.observable(rpt.value.FiscalYear())
	subchan.breakdownValue = ko.observableArray([])
	subchan.breakdownChannelValue = ko.observableArray([])
	subchan.level = ko.observable(1)
	subchan.what = ko.observable('mt sub channel')
	subchan.isInlineFilter = ko.observable(true)


	// channel, account, branch, distributor
	// put key account
	subchan.useFilterChannel = ko.observable(true)
	subchan.useFilterAccount = ko.observable(true)
	subchan.useFilterBranch = ko.observable(true)
	subchan.useFilterDistributor = ko.observable(true)

	subchan.resetFilterVisibility = () => {
		subchan.useFilterChannel(true)
		subchan.useFilterAccount(true)
		subchan.useFilterBranch(true)
		subchan.useFilterDistributor(true)
		subchan.optionAccount(rpt.masterData
			.KeyAccount())
	}

	subchan.switchRefresh = (title, what) => {
		if (what == 'mt sub channel') {
			subchan.useFilterChannel(false)
			subchan.useFilterBranch(false)
			subchan.useFilterDistributor(false)
			subchan.optionAccount(rpt.masterData
				.KeyAccount()
				.filter((d) => d._id != "GNT"))
		}

		subchan.breakdownBrand(['All'])
		subchan.breakdownDistributor(['All'])
		subchan.breakdownGeneralTrade(['All'])
		subchan.breakdownCity(['All'])
		subchan.breakdownBranch(['All'])
		subchan.breakdownBranchGroup(['All'])
		subchan.breakdownChannelValue(['All'])

		bkd.title(title); 
		subchan.what(what)
		subchan.refresh()
	}

	subchan.refresh = (useCache = false) => {
		subchan.isInlineFilter(true)

		let param = {}
		param.pls = []
		param.aggr = 'sum'
		param.filters = rpt.getFilterValue(false, subchan.fiscalYear)
		let groups = []

		if (subchan.what() == 'mt sub channel') {
			subchan.breakdownBy('customer.reportsubchannel')
			subchan.breakdownValue(['I3'])
			groups.push(subchan.breakdownBy())

			param.filters.push({
				Field: 'customer.channelname',
				Op: '$in',
				Value: subchan.breakdownValue()
			})
		} else if (subchan.what() == 'account') {
			subchan.breakdownBy('customer.keyaccount')
			groups.push(subchan.breakdownBy())
		} else if (subchan.what() == 'brand') {
			subchan.isInlineFilter(false)
			subchan.breakdownBy('product.brand')
			groups.push(subchan.breakdownBy())

			let breakdownBrand = subchan.breakdownBrand().filter((d) => d != 'All')
			if (breakdownBrand.length > 0) {
				param.filters.push({
					Field: subchan.breakdownBy(),
					Op: '$in',
					Value: breakdownBrand
				})
			}
			let breakdownChannel = subchan.breakdownChannelValue().filter((d) => d != 'All')
			groups.push("customer.channelname")
			if (breakdownChannel.length > 0) {
				param.filters.push({
					Field: "customer.channelname",
					Op: '$in',
					Value: breakdownChannel
				})
			}
		} else if (subchan.what() == 'rd') {
			subchan.isInlineFilter(false)
			subchan.breakdownBy('customer.reportsubchannel')
			groups.push(subchan.breakdownBy())

			let breakdownChannel = 'customer.channelname'
			groups.push(breakdownChannel)
			param.filters.push({
				Field: breakdownChannel,
				Op: '$in',
				Value: ['I1']
			})

			let breakdownDistributor = subchan.breakdownDistributor().filter((d) => d != 'All')
			if (breakdownDistributor.length > 0) {
				param.filters.push({
					Field: subchan.breakdownBy(),
					Op: '$in',
					Value: breakdownDistributor
				})
			}
		} else if (subchan.what() == 'gt') {
			subchan.isInlineFilter(false)
			subchan.breakdownBy('customer.reportsubchannel')
			groups.push(subchan.breakdownBy())

			let breakdownChannel = 'customer.channelname'
			groups.push(breakdownChannel)
			param.filters.push({
				Field: breakdownChannel,
				Op: '$in',
				Value: ['I2']
			})

			let breakdownGeneralTrade = subchan.breakdownGeneralTrade().filter((d) => d != 'All')
			if (breakdownGeneralTrade.length > 0) {
				param.filters.push({
					Field: subchan.breakdownBy(),
					Op: '$in',
					Value: breakdownGeneralTrade
				})
			}
		} else if (subchan.what() == 'city') {
			subchan.isInlineFilter(false)
			subchan.breakdownBy('customer.areaname')
			groups.push(subchan.breakdownBy())

			let breakdownCity = subchan.breakdownCity().filter((d) => d != 'All')
			if (breakdownCity.length > 0) {
				param.filters.push({
					Field: subchan.breakdownBy(),
					Op: '$in',
					Value: breakdownCity
				})
			}
			let breakdownChannel = subchan.breakdownChannelValue().filter((d) => d != 'All')
			groups.push("customer.channelname")
			if (breakdownChannel.length > 0) {
				param.filters.push({
					Field: "customer.channelname",
					Op: '$in',
					Value: breakdownChannel
				})
			}
		} else if (subchan.what() == 'branch') {
			subchan.isInlineFilter(false)
			subchan.breakdownBy('customer.branchname')
			groups.push(subchan.breakdownBy())

			param.filters.push({
				Field: "customer.channelname",
				Op: "$in",
				Value: rpt.masterData.Channel()
					.map((d) => d._id)
					.filter((d) => d != "EXP")
			})

			let breakdownBranch = subchan.breakdownBranch().filter((d) => d != 'All')
			if (breakdownBranch.length > 0) {
				param.filters.push({
					Field: "customer.branchname",
					Op: '$in',
					Value: breakdownBranch
				})
			}

			let breakdownChannel = subchan.breakdownChannelValue().filter((d) => d != 'All')
			groups.push("customer.channelname")
			if (breakdownChannel.length > 0) {
				param.filters.push({
					Field: "customer.channelname",
					Op: '$in',
					Value: breakdownChannel
				})
			}
		} else if (subchan.what() == 'branch-group') {
			subchan.isInlineFilter(false)
			subchan.breakdownBy('customer.branchgroup')
			groups.push(subchan.breakdownBy())
			
			param.filters.push({
				Field: "customer.channelname",
				Op: "$in",
				Value: rpt.masterData.Channel()
					.map((d) => d._id)
					.filter((d) => d != "EXP")
			})

			let breakdownBranchGroup = subchan.breakdownBranchGroup().filter((d) => d != 'All')
			if (breakdownBranchGroup.length > 0) {
				param.filters.push({
					Field: "customer.branchgroup",
					Op: '$in',
					Value: breakdownBranchGroup
				})
			}

			let breakdownChannel = subchan.breakdownChannelValue().filter((d) => d != 'All')
			groups.push("customer.channelname")
			if (breakdownChannel.length > 0) {
				param.filters.push({
					Field: "customer.channelname",
					Op: '$in',
					Value: breakdownChannel
				})
			}
		}

		$('.breakdown-view:not(#subchan)').empty()

		param.groups = rpt.parseGroups(groups)
		subchan.contentIsLoading(true)

		let fetch = () => {
			subchan.injectFilters(param.filters)
			rpt.injectMonthQuarterFilter(param.filters)
			toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
				if (res.Status == "NOK") {
					setTimeout(() => {
						fetch()
					}, 1000 * 5)
					return
				}

				if (rpt.isEmptyData(res)) {
					subchan.contentIsLoading(false)
					return
				}

				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
				let data = subchan.buildStructure(res.Data.Data)
				subchan.data(data)
				rpt.plmodels(res.Data.PLModels)
				subchan.emptyGrid()
				subchan.contentIsLoading(false)
				subchan.render()
				rpt.prepareEvents()
			}, () => {
				subchan.emptyGrid()
				subchan.contentIsLoading(false)
			})
		}

		fetch()
	}

	subchan.clickExpand = (e) => {
		let right = $(e).find('i.fa-chevron-right').length, down = 0
		if (e.attr('idheaderpl') == 'PL0')
			down = $(e).find('i.fa-chevron-up').length
		else
			down = $(e).find('i.fa-chevron-down').length
		if (right > 0){
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
				$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
			}

			$(e).find('i').removeClass('fa-chevron-right')
			if (e.attr('idheaderpl') == 'PL0')
				$(e).find('i').addClass('fa-chevron-up')
			else
				$(e).find('i').addClass('fa-chevron-down')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
			$(`tr[statusvaltemp=hide]`).css('display', 'none')
			rpt.refreshHeight(e.attr('idheaderpl'))
			rpt.refreshchildadd(e.attr('idheaderpl'))
		}
		if (down > 0) {
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', '')
				$('.pivot-pnl .table-content').css('margin-left', '')
			}
			
			$(e).find('i').removeClass('fa-chevron-up')
			$(e).find('i').removeClass('fa-chevron-down')
			$(e).find('i').addClass('fa-chevron-right')
			$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
			rpt.hideAllChild(e.attr('idheaderpl'))
		}
	}

	subchan.emptyGrid = () => {
		$('#subchan').replaceWith(`<div class="breakdown-view ez" id="subchan"></div>`)
	}

	subchan.buildStructure = (data) => {
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
			return d._id[`_id_${toolkit.replace(subchan.breakdownBy(), '.', '_')}`]
		}).map((d) => {
			d.breakdowns = d.subs[0]._id
			d.count = 1

			return d
		})

		subchan.level(1)
		let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
		return newParsed
	}

	subchan.render = () => {
		if (subchan.data().length == 0) {
			$('#subchan').html('No data found.')
			return
		}


		// ========================= TABLE STRUCTURE

		let percentageWidth = 100

		let wrapper = toolkit.newEl('div')
			.addClass('pivot-pnl-branch pivot-pnl')
			.appendTo($('#subchan'))

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
			.css('height', `${rpt.rowHeaderHeight() * subchan.level()}px`)
			.attr('data-rowspan', subchan.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('Total')
			.css('height', `${rpt.rowHeaderHeight() * subchan.level()}px`)
			.attr('data-rowspan', subchan.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header align-right')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('% of N Sales')
			.css('height', `${rpt.rowHeaderHeight() * subchan.level()}px`)
			.css('vertical-align', 'middle')
			.css('font-weight', 'normal')
			.css('font-style', 'italic')
			.width(percentageWidth - 20)
			.attr('data-rowspan', subchan.level())
			.addClass('cell-percentage-header align-right')
			.appendTo(trHeader)

		let trContents = []
		for (let i = 0; i < subchan.level(); i++) {
			trContents.push(toolkit.newEl('tr')
				.appendTo(tableContent)
				.css('height', `${rpt.rowHeaderHeight()}px`))
		}



		// ========================= BUILD HEADER

		let data = subchan.data()

		let columnWidth = 130
		let totalColumnWidth = 0
		let pnlTotalSum = 0
		let dataFlat = []

		let countWidthThenPush = (thheader, each, key) => {
			let currentColumnWidth = each._id.length * ((subchan.breakdownBy() == 'customer.channelname') ? 7 : 10)
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

			if (subchan.level() == 1) {
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

				if (subchan.level() == 2) {
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
				subchan.clickExpand(trHeader)
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
					subchan.renderDetail(d.PLCode, e.breakdowns)
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

	subchan.breakdownBrand = ko.observableArray([])
	subchan.optionBreakdownBrandValues = ko.observableArray([])
	subchan.optionBreakdownChannelValues = ko.observableArray([])
	subchan.changeBreakdownBrand = () => {
		let all = kac.breakdownValueAll
		let masterData = []

		masterData = rpt.masterData.Brand()

		toolkit.runUntil((i) => {
			subchan.optionBreakdownBrandValues([all].concat(
				masterData.map((d) => { 
					return { _id: d.Name, Name: d.Name } })
				)
			)

			subchan.breakdownBrand([all._id])

			subchan.optionBreakdownChannelValues([all].concat(rpt.masterData.Channel()))
			subchan.breakdownChannelValue([all._id])
		}, (i) => (i > 10) || (masterData.length > 0))
	}

	subchan.changeBreakdownBrandValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = subchan.breakdownBrand().length == 2
			let condA2 = subchan.breakdownBrand().indexOf(all._id) == 0
			if (condA1 && condA2) {
				subchan.breakdownBrand.remove(all._id)
				return
			}

			let condB1 = subchan.breakdownBrand().length > 1
			let condB2 = subchan.breakdownBrand().reverse()[0] == all._id
			if (condB1 && condB2) {
				subchan.breakdownBrand([all._id])
				return
			}

			let condC1 = subchan.breakdownBrand().length == 0
			if (condC1) {
				subchan.breakdownBrand([all._id])
			}
		}, 100)
	}

	subchan.changeBreakdownChannelValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = subchan.breakdownChannelValue().length == 2
			let condA2 = subchan.breakdownChannelValue().indexOf(all._id) == 0
			if (condA1 && condA2) {
				subchan.breakdownChannelValue.remove(all._id)
				return
			}

			let condB1 = subchan.breakdownChannelValue().length > 1
			let condB2 = subchan.breakdownChannelValue().reverse()[0] == all._id
			if (condB1 && condB2) {
				subchan.breakdownChannelValue([all._id])
				return
			}

			let condC1 = subchan.breakdownChannelValue().length == 0
			if (condC1) {
				subchan.breakdownChannelValue([all._id])
			}
		}, 100)
	}


	subchan.breakdownDistributor = ko.observableArray([])
	subchan.optionBreakdownDistributorValues = ko.observableArray([])
	subchan.changeBreakdownDistributor = () => {
		let all = kac.breakdownValueAll
		let masterData = []

		masterData = subchan.optionDistributor()

		toolkit.runUntil((i) => {
			subchan.optionBreakdownDistributorValues([all].concat(
				masterData.map((d) => { 
					return { _id: d.Name, Name: d.Name } })
				)
			)

			subchan.breakdownDistributor([all._id])
		}, (i) => (i > 10) || (masterData.length > 0))
	}
	subchan.changeBreakdownDistributorValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = subchan.breakdownDistributor().length == 2
			let condA2 = subchan.breakdownDistributor().indexOf(all._id) == 0
			if (condA1 && condA2) {
				subchan.breakdownDistributor.remove(all._id)
				return
			}

			let condB1 = subchan.breakdownDistributor().length > 1
			let condB2 = subchan.breakdownDistributor().reverse()[0] == all._id
			if (condB1 && condB2) {
				subchan.breakdownDistributor([all._id])
				return
			}

			let condC1 = subchan.breakdownDistributor().length == 0
			if (condC1) {
				subchan.breakdownDistributor([all._id])
			}
		}, 100)
	}


	subchan.breakdownGeneralTrade = ko.observableArray([])
	subchan.optionBreakdownGeneralTradeValues = ko.observableArray([])
	subchan.changeBreakdownGeneralTrade = () => {
		let all = kac.breakdownValueAll
		let masterData = []

		masterData = subchan.optionGeneralTrade()

		toolkit.runUntil((i) => {
			subchan.optionBreakdownGeneralTradeValues([all].concat(
				masterData.map((d) => { 
					return { _id: d.Name, Name: d.Name } })
				)
			)

			subchan.breakdownGeneralTrade([all._id])
		}, (i) => (i > 10) || (masterData.length > 0))
	}
	subchan.changeBreakdownGeneralTradeValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = subchan.breakdownGeneralTrade().length == 2
			let condA2 = subchan.breakdownGeneralTrade().indexOf(all._id) == 0
			if (condA1 && condA2) {
				subchan.breakdownGeneralTrade.remove(all._id)
				return
			}

			let condB1 = subchan.breakdownGeneralTrade().length > 1
			let condB2 = subchan.breakdownGeneralTrade().reverse()[0] == all._id
			if (condB1 && condB2) {
				subchan.breakdownGeneralTrade([all._id])
				return
			}

			let condC1 = subchan.breakdownGeneralTrade().length == 0
			if (condC1) {
				subchan.breakdownGeneralTrade([all._id])
			}
		}, 100)
	}


	subchan.breakdownCity = ko.observableArray([])
	subchan.optionBreakdownCityValues = ko.observableArray([])
	subchan.changeBreakdownCity = () => {
		let all = kac.breakdownValueAll
		let masterData = []

		masterData = subchan.optionCity()

		toolkit.runUntil((i) => {
			subchan.optionBreakdownCityValues([all].concat(
				masterData.map((d) => { 
					return { _id: d.Name, Name: d.Name } })
				)
			)

			subchan.breakdownCity([all._id])
		}, (i) => (i > 10) || (masterData.length > 0))
	}
	subchan.changeBreakdownCityValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = subchan.breakdownCity().length == 2
			let condA2 = subchan.breakdownCity().indexOf(all._id) == 0
			if (condA1 && condA2) {
				subchan.breakdownCity.remove(all._id)
				return
			}

			let condB1 = subchan.breakdownCity().length > 1
			let condB2 = subchan.breakdownCity().reverse()[0] == all._id
			if (condB1 && condB2) {
				subchan.breakdownCity([all._id])
				return
			}

			let condC1 = subchan.breakdownCity().length == 0
			if (condC1) {
				subchan.breakdownCity([all._id])
			}
		}, 100)
	}



	subchan.breakdownBranch = ko.observableArray([])
	subchan.optionBreakdownBranchValues = ko.observableArray([])
	subchan.changeBreakdownBranch = () => {
		let all = kac.breakdownValueAll
		let masterData = []

		masterData = subchan.optionBranch()

		toolkit.runUntil((i) => {
			subchan.optionBreakdownBranchValues([all].concat(
				masterData.map((d) => { 
					return { _id: d.Name, Name: d.Name } })
				)
			)

			subchan.breakdownBranch([all._id])
		}, (i) => (i > 10) || (masterData.length > 0))
	}
	subchan.changeBreakdownBranchValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = subchan.breakdownBranch().length == 2
			let condA2 = subchan.breakdownBranch().indexOf(all._id) == 0
			if (condA1 && condA2) {
				subchan.breakdownBranch.remove(all._id)
				return
			}

			let condB1 = subchan.breakdownBranch().length > 1
			let condB2 = subchan.breakdownBranch().reverse()[0] == all._id
			if (condB1 && condB2) {
				subchan.breakdownBranch([all._id])
				return
			}

			let condC1 = subchan.breakdownBranch().length == 0
			if (condC1) {
				subchan.breakdownBranch([all._id])
			}
		}, 100)
	}


	subchan.breakdownBranchGroup = ko.observableArray([])
	subchan.optionBreakdownBranchGroupValues = ko.observableArray([])
	subchan.changeBreakdownBranchGroup = () => {
		let all = kac.breakdownValueAll
		let masterData = []

		masterData = subchan.optionBranchGroup()

		toolkit.runUntil((i) => {
			subchan.optionBreakdownBranchGroupValues([all].concat(
				masterData.map((d) => { 
					return { _id: d.Name, Name: d.Name } })
				)
			)

			subchan.breakdownBranchGroup([all._id])
		}, (i) => (i > 10) || (masterData.length > 0))
	}
	subchan.changeBreakdownBranchGroupValue = () => {
		let all = kac.breakdownValueAll
		setTimeout(() => {
			let condA1 = subchan.breakdownBranchGroup().length == 2
			let condA2 = subchan.breakdownBranchGroup().indexOf(all._id) == 0
			if (condA1 && condA2) {
				subchan.breakdownBranchGroup.remove(all._id)
				return
			}

			let condB1 = subchan.breakdownBranchGroup().length > 1
			let condB2 = subchan.breakdownBranchGroup().reverse()[0] == all._id
			if (condB1 && condB2) {
				subchan.breakdownBranchGroup([all._id])
				return
			}

			let condC1 = subchan.breakdownBranchGroup().length == 0
			if (condC1) {
				subchan.breakdownBranchGroup([all._id])
			}
		}, 100)
	}


	subchan.optionChannel = ko.observableArray([])
	subchan.optionMTBreakdown = ko.observableArray([])
	subchan.optionAccount = ko.observableArray([])
	subchan.optionKeyAccount = ko.observableArray([])
	subchan.optionBrand = ko.observableArray([])
	subchan.optionBranch = ko.observableArray([])
	subchan.optionBranchGroup = ko.observableArray([])
	subchan.optionDistributor = ko.observableArray([])
	subchan.optionGeneralTrade = ko.observableArray([])
	subchan.optionCity = ko.observableArray([])

	subchan.fillOptionFilters = () => {
		app.ajaxPost(viewModel.appName + "report/getdatachannel", {}, (res) => {
			subchan.optionChannel(_.orderBy(res.data.map((d) => { 
				return { _id: d._id, Name: d.Name }
			}), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatamasterhypersupermini", {}, (res) => {
			subchan.optionMTBreakdown(_.orderBy(res.data.map((d) => { 
				return { _id: d._id, Name: d.Name }
			}), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatakeyaccount", {}, (res) => {
			subchan.optionAccount(_.orderBy(res.data.map((d) => { 
				return { _id: d._id, Name: d.Name }
			}).concat({ _id: 'OHTER', Name: 'OHTER' }), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatacustomergroup", {}, (res) => {
			subchan.optionKeyAccount(_.orderBy(res.data.map((d) => { 
				return { _id: d.Name, Name: d.Name }
			}).concat({ _id: 'OHTER', Name: 'OHTER' }), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatabrand", {}, (res) => {
			subchan.optionBrand(_.orderBy(res.data.map((d) =>  
				({ _id: d._id, Name: d.Name })
			), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatabranch", {}, (res) => {
			subchan.optionBranch(_.orderBy(res.data.map((d) =>  
				({ _id: d.Name, Name: d.Name })
			), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatamasterbranchgroup", {}, (res) => {
			subchan.optionBranchGroup(_.orderBy(res.data.map((d) =>  
				({ _id: d.Name, Name: d.Name })
			), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatahgeographi", {}, (res) => {
			subchan.optionCity(_.orderBy(res.data.map((d) =>  
				({ _id: d._id, Name: d._id })
			), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatamasterdistributor", {}, (res) => {
			subchan.optionDistributor(_.orderBy(res.data.map((d) =>  
				({ _id: d.Name, Name: d.Name })
			), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatamastergeneraltrade", {}, (res) => {
			subchan.optionGeneralTrade(_.orderBy(res.data.map((d) =>  
				({ _id: d.Name, Name: d.Name })
			), (d) => d.Name))
		})

		app.ajaxPost(viewModel.appName + "report/getdatahgeographi", {}, (res) => {
			subchan.optionCity(_.orderBy(res.data.map((d) =>  
				({ _id: d._id, Name: d._id })
			), (d) => d._id))
		})
	}

	subchan.filterChannel = ko.observableArray([])
	subchan.filterMTBreakdown = ko.observableArray([])
	subchan.filterAccount = ko.observableArray([])
	subchan.filterKeyAccount = ko.observableArray([])
	subchan.filterBrand = ko.observableArray([])
	subchan.filterBranch = ko.observableArray([])
	subchan.filterBranchGroup = ko.observableArray([])
	subchan.filterCity = ko.observableArray([])
	subchan.filterDistributor = ko.observableArray([])

	subchan.injectFilters = (filters) => {
		let DA_LORD_OF_DA_RING = [
			{ field: 'customer.channelname', holder: subchan.filterChannel },
			{ field: 'customer.reportsubchannel', holder: subchan.filterMTBreakdown },
			{ field: 'customer.keyaccount', holder: subchan.filterAccount },
			{ field: 'customer.customergroupname', holder: subchan.filterKeyAccount },
			{ field: 'product.brand', holder: subchan.filterBrand },
			{ field: 'customer.branchname', holder: subchan.filterBranch },
			{ field: 'customer.branchgroup', holder: subchan.filterBranchGroup },
			{ field: 'customer.areaname', holder: subchan.filterCity },
			{ field: 'customer.reportsubchannel', holder: subchan.filterDistributor },
		]

	DA_LORD_OF_DA_RING
		.filter((d) => d.holder().length > 0)
		.forEach((d) => {
			let previousFilter = filters.find((e) => e.Field == d.field)
			if (toolkit.isDefined(previousFilter)) {
				previousFilter.Value = previousFilter.Value.concat(d.holder())
			} else {
				filters.push({
					Field: d.field,
					Op: '$in',
					Value: d.holder()
				})
			}
		})
	}
})()







viewModel.dashboard = {}
let dsbrd = viewModel.dashboard

;(() => {
	dsbrd.rows = ko.observableArray([
		{ pnl: "Net Sales", plcodes: ["PL8A"] },
		{ pnl: 'Net Sales Growth', plcodes: [] }, // NOT YET
		{ pnl: 'Discount Activity', plcodes: ["PL7A"] },
		{ pnl: "COGS", plcodes: ["PL74B"] },
		{ pnl: "Gross Margin", plcodes: ["PL74C"] },
		{ pnl: "Advt & Promo", plcodes: ["PL32A"] },
		{ pnl: "Royalties", plcodes: ["PL26A"] },
		{ pnl: "G&A Expenses", plcodes: ["PL94A"] },
		{ pnl: "EBIT", plcodes: ["PL44B"] },
		{ pnl: "EBIT %", plcodes: [] },
		{ pnl: "EBITDA", plcodes: ["PL44C"] },
		{ pnl: "EBITDA & Royalties", plcodes: ["PL44D"] },
	])

	dsbrd.data = ko.observableArray([])
	dsbrd.columns = ko.observableArray([])
	dsbrd.breakdown = ko.observable('customer.channelname')
	dsbrd.fiscalYears = ko.observableArray(rpt.value.FiscalYears())
	dsbrd.contentIsLoading = ko.observable(false)
	dsbrd.optionStructures = ko.observableArray([
		{ field: "date.fiscal", name: "Fiscal Year" },
		{ field: "date.quartertxt", name: "Quarter" },
		{ field: "date.month", name: "Month" }
	])
	dsbrd.structure = ko.observable(dsbrd.optionStructures()[0].field)
	dsbrd.structureYear = ko.observable('date.year')
	dsbrd.optionBreakdownValues = ko.observableArray([])
	dsbrd.breakdownValue = ko.observableArray([])
	dsbrd.breakdownValueAll = { _id: 'All', Name: 'All' }
	dsbrd.changeBreakdown = () => {
		let all = dsbrd.breakdownValueAll
		let map = (arr) => arr.map((d) => {
			if (dsbrd.breakdown() == "customer.channelname") {
				return d
			}

			return { _id: d.Name, Name: d.Name }
		})
		setTimeout(() => {
			switch (dsbrd.breakdown()) {
				case "customer.branchname":
					dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
					dsbrd.breakdownValue([all._id])
				break;
				case "product.brand":
					dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
					dsbrd.breakdownValue([all._id])
				break;
				case "customer.channelname":
					dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
					dsbrd.breakdownValue([all._id])
				break;
				case "customer.zone":
					dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
					dsbrd.breakdownValue([all._id])
				break;
				case "customer.areaname":
					dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
					dsbrd.breakdownValue([all._id])
				break;
				case "customer.region":
					dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
					dsbrd.breakdownValue([all._id])
				break;
				case "customer.keyaccount":
					dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
					dsbrd.breakdownValue([all._id])
				break;
			}
		}, 100)
	}

	dsbrd.changeBreakdownValue = () => {
		let all = dsbrd.breakdownValueAll
		setTimeout(() => {
			let condA1 = dsbrd.breakdownValue().length == 2
			let condA2 = dsbrd.breakdownValue().indexOf(all._id) == 0
			if (condA1 && condA2) {
				dsbrd.breakdownValue.remove(all._id)
				return
			}

			let condB1 = dsbrd.breakdownValue().length > 1
			let condB2 = dsbrd.breakdownValue().reverse()[0] == all._id
			if (condB1 && condB2) {
				dsbrd.breakdownValue([all._id])
				return
			}

			let condC1 = dsbrd.breakdownValue().length == 0
			if (condC1) {
				dsbrd.breakdownValue([all._id])
			}
		}, 100)
	}

	dsbrd.refresh = () => {
		if (dsbrd.breakdownValue().length == 0) {
			toolkit.showError('Please choose at least breakdown value')
			return
		}

		let param = {}
		param.pls = _.flatten(dsbrd.rows().map((d) => d.plcodes))
		param.groups = rpt.parseGroups([dsbrd.breakdown(), dsbrd.structure()])
		param.aggr = 'sum'
		param.filters = rpt.getFilterValue(true, dsbrd.fiscalYears)

		let breakdownValue = dsbrd.breakdownValue().filter((d) => d != 'All')
		if (breakdownValue.length > 0) {
			param.filters.push({
				Field: dsbrd.breakdown(),
				Op: '$in',
				Value: dsbrd.breakdownValue()
			})
		}

		if (dsbrd.structure() == 'date.month') {
			param.groups.push(dsbrd.structureYear())
		}

		let fetch = () => {
			subchan.injectFilters(param.filters)
			rpt.injectMonthQuarterFilter(param.filters)
			toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
				if (res.Status == "NOK") {
					setTimeout(() => { fetch() }, 1000 * 5)
					return
				}

				if (rpt.isEmptyData(res)) {
					dsbrd.contentIsLoading(false)
					return
				}

				dsbrd.contentIsLoading(false)
				dsbrd.render(res)
			}, () => {
				dsbrd.contentIsLoading(false)
			})
		}

		dsbrd.contentIsLoading(true)
		fetch()
	}

	dsbrd.render = (res) => {
		let rows = []
		let rowsAfter = []
		let columnsPlaceholder = [{ 
			field: 'pnl', 
			title: 'PNL', 
			attributes: { class: 'bold' }, 
			headerAttributes: { style: 'font-weight: bold; vertical-align: middle;' }, 
			width: 130
		}, { 
			field: 'total', 
			title: 'Total', 
			attributes: { class: 'bold align-right bold' }, 
			headerAttributes: { style: 'font-weight: bold; vertical-align: middle; text-align: right;' }, 
			width: 130
		}]

		let data = res.Data.Data

		dsbrd.rows().forEach((row, rowIndex) => {
			row.columnData = []
			data.forEach((column, columnIndex) => {
				let timeBreakdown = toolkit.redefine(column._id[`_id_${toolkit.replace(dsbrd.structure(), '.', '_')}`])

				if (dsbrd.structure() === 'date.month') {
					let year = column._id[`_id_date_fiscal`].split('-')[0]
					timeBreakdown = `${year}${timeBreakdown}`
				}

				let columnAfter = {
					breakdownTitle: toolkit.redefine(column._id[`_id_${toolkit.replace(dsbrd.breakdown(), '.', '_')}`]), 
					structureTitle: timeBreakdown,
					original: toolkit.sum(row.plcodes, (plcode) => toolkit.number(column[plcode])),
					value: toolkit.sum(row.plcodes, (plcode) => toolkit.number(column[plcode])),
				}

				row.columnData.push(columnAfter)
			})

			rowsAfter.push(row)
		})

		if (rowsAfter.length > 0) {
			let grossSales = rowsAfter.find((d) => d.pnl == 'Net Sales')
			let ebit = rowsAfter.find((d) => d.pnl == 'EBIT')
			let columns = rowsAfter[0].columnData

			rowsAfter.forEach((row, rowIndex) => {
				row.columnData.forEach((column, columnIndex) => {
					if (row.pnl == 'EBIT %') {
						let percentage = kendo.toString(toolkit.number(ebit.columnData[columnIndex].original / grossSales.columnData[columnIndex].original) * 100, 'n2')
						column.value = `${percentage} %`;
					} else if (row.pnl != 'Net Sales' && row.pnl != 'EBIT') {
						let percentage = kendo.toString(toolkit.number(column.original / grossSales.columnData[columnIndex].original) * 100, 'n2')
						column.value = `${percentage} %`;
					}
				})

				let total = toolkit.sum(row.columnData, (d) => d.original)
				row.total = kendo.toString(total, 'n0')
				if (row.pnl == 'EBIT %') {
					let totalGrossSales = toolkit.sum(grossSales.columnData, (d) => d.original)
					let totalEbit = toolkit.sum(ebit.columnData, (d) => d.original)
					let percentage = toolkit.number(totalEbit / totalGrossSales) * 100
					row.total = `${kendo.toString(percentage, 'n2')} %`
				}
			})
		}

		let columnData = []
		data.forEach((d, i) => {
			let columnInfo = rowsAfter[0].columnData[i]
			let title = $.trim(toolkit.redefine(columnInfo.breakdownTitle, ''))

			let column = {}
			column.field = `columnData[${i}].value`
			column.breakdown = title
			column.title = $.trim(columnInfo.structureTitle)
			column.width = 150
			column.format = '{0:n0}'
			column.attributes = { class: 'align-right' }
			column.headerAttributes = { 
				style: 'text-align: center !important; font-weight: bold; border-right: 1px solid white; ',
			}

			columnData.push(column)
		})

		let op1 = _.groupBy(columnData, (d) => d.breakdown)
		let op2 = _.map(op1, (v, k) => { 
			return { 
				title: ($.trim(k) == '' ? '' : k), 
				columns: v,
				headerAttributes: { 
					style: 'text-align: center !important; font-weight: bold; border: 1px solid white; border-top: none; border-left: none; box-sizing: border-box; background-color: #e9eced;',
				}
			}
		})

		let columnGrouped = op2.map((d) => {
			d.columns = _.sortBy(d.columns, (e) => {
				if (dsbrd.structure() === 'date.month') {
					return parseInt(e.title, 10)
				}

				return e.title
			})

			return d
		})

		if (columnGrouped.length > 0) {
			columnsPlaceholder[0].locked = true
			columnsPlaceholder[1].locked = true
		}

		columnGrouped = _.orderBy(columnGrouped, (d) => {
			let value = 0
			let dataColumn = rowsAfter[0].columnData
				.find((e) => $.trim(e.breakdownTitle) == $.trim(d.title))
			if (typeof dataColumn != 'undefined') {
				value = dataColumn.value
			}

			return rpt.orderByChannel(d.title, value)
		}, 'desc')

		if (dsbrd.structure() === 'date.month') {
			columnGrouped.forEach((d) => {
				d.columns.forEach((e) => {
					let year = moment(e.title, 'YYYYM').year()
					let month = moment(e.title, 'YYYYM').month()

					let ouyea =  moment(new Date(year, month + 3, 1))
					e.title = ouyea.format("MMMM YYYY")
				})
			})
		}

		dsbrd.data(rowsAfter)
		dsbrd.columns(columnsPlaceholder.concat(columnGrouped))

		let grossSales = dsbrd.data().find((d) => d.pnl == "Net Sales")
		let growth = dsbrd.data().find((d) => d.pnl == "Net Sales Growth")

		let counter = 0
		let prevIndex = 0
		columnGrouped.forEach((d) => {
			d.columns.forEach((e, i) => {
				let index = toolkit.getNumberFromString(e.field)

				if ((i + 1) == d.columns.length) {
					e.attributes.style = `${e.attributes.style}; border-right: 1px solid rgb(240, 243, 244);`
				}

				if (i == 0) {
					prevIndex = index
					counter++
					return
				}

				let gs = grossSales.columnData[index]
				let gsPrev = grossSales.columnData[prevIndex]
				let g = growth.columnData[index]
				let value = toolkit.number((gs.value - gsPrev.value) / gsPrev.value) * 100
				console.log('----', gs.value, gsPrev.value)
				g.value = `${kendo.toString(value, 'n2')} %`

				counter++
				prevIndex = index
			})
		})

		let config = {
			dataSource: {
				data: dsbrd.data()
			},
			columns: dsbrd.columns(),
			resizable: false, 
			sortable: false, 
			pageable: false,
			filterable: false,
			dataBound: () => {
				let sel = '.grid-dashboard .k-grid-content-locked tr, .grid-dashboard .k-grid-content tr'

				$(sel).on('mouseenter', function () {
					let index = $(this).index()
			        let elh = $(`.grid-dashboard .k-grid-content-locked tr:eq(${index})`).addClass('hover')
			        let elc = $(`.grid-dashboard .k-grid-content tr:eq(${index})`).addClass('hover')
				})
				$(sel).on('mouseleave', function () {
					$('.grid-dashboard tr.hover').removeClass('hover')
				})
			}
		}

		$('.grid-dashboard').replaceWith('<div class="grid-dashboard"></div>')
		$('.grid-dashboard').kendoGrid(config)
	}
})()









viewModel.dashboardRanking = {}
let rank = viewModel.dashboardRanking

;(() => {
	rank.optionDimensions = ko.observableArray([
		{ field: 'NonRD', name: 'Non RD Sales' },
		{ field: 'OnlyRD', name: 'Only RD Sales' },
		{ field: 'customer.keyaccount', name: 'Key Account' },
	].concat(rpt.optionDimensions().slice(0)))
	rank.breakdown = ko.observable('customer.channelname')
	rank.columns = ko.observableArray([
		{ field: 'pnl', title: 'PNL', attributes: { class: 'bold' }, footerTemplate: 'Total' },
		{ width: 90, field: 'gmPercentage', template: (d) => `${kendo.toString(d.gmPercentage, 'n2')} %`, title: 'GM %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
		{ width: 90, field: 'cogsPercentage', template: (d) => `${kendo.toString(d.cogsPercentage, 'n2')} %`, title: 'COGS %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
		{ width: 90, field: 'ebitPercentage', template: (d) => `${kendo.toString(d.ebitPercentage, 'n2')} %`, title: 'EBIT %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
		{ width: 90, field: 'ebitdaPercentage', template: (d) => `${kendo.toString(d.ebitdaPercentage, 'n2')} %`, title: 'EBITDA %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
		{ field: 'anp', title: 'Advt & Promo', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, aggregates: ["sum"],footerTemplate: "<div class='align-right'>#=kendo.toString(sum, 'n0')#</div>", format: '{0:n0}' },
		// { field: 'anpPercentage', template: (d) => `${kendo.toString(d.anpPercentage, 'n2')} %`, title: 'Advt & Promo %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
		{ width: 120, field: 'ebitdaRoyalties', title: 'EBITDA & Royalties', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, aggregates: ["sum"],footerTemplate: "<div class='align-right'>#=kendo.toString(sum, 'n0')#</div>", format: '{0:n0}' },
		{ field: 'netMargin', title: 'Net Margin', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, aggregates: ["sum"],footerTemplate: "<div class='align-right'>#=kendo.toString(sum, 'n0')#</div>", format: '{0:n0}' },
		{ field: 'netSales', title: 'Net Sales', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, aggregates: ["sum"],footerTemplate: "<div class='align-right'>#=kendo.toString(sum, 'n0')#</div>", format: '{0:n0}' },
		{ field: 'ebit', title: 'EBIT', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, aggregates: ["sum"],footerTemplate: `<div class='align-right'>#=kendo.toString(sum, 'n0')#</div>`, format: '{0:n0}' },
	])
	rank.contentIsLoading = ko.observable(false)
	rank.data = ko.observableArray([])
	rank.fiscalYear = ko.observable(rpt.value.FiscalYear())

	rank.refresh = () => {
		let breakdown = rank.breakdown()
		let isRDNonRD = (['OnlyRD', 'NonRD'].indexOf(rank.breakdown()) > -1)

		if (isRDNonRD) {
			breakdown = 'customer.channelname'
		}

		let param = {}
		param.pls = ["PL74C", "PL74B", "PL44B", "PL44C", "PL8A", "PL32A", 'PL44D']
		param.groups = rpt.parseGroups([breakdown])
		param.aggr = 'sum'
		param.filters = rpt.getFilterValue(false, rank.fiscalYear)

		if (isRDNonRD) {
			let values = ('OnlyRD' == rank.breakdown()) ? 
				['I1'] : ["EXP", "I2", "I4", "I6", "I3"]

			param.filters.push({
				Field: 'customer.channelname',
				Op: '$in',
				Value: values
			})
		}

		let fetch = () => {
			subchan.injectFilters(param.filters)
			rpt.injectMonthQuarterFilter(param.filters)
			toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
				if (res.Status == "NOK") {
					setTimeout(() => { fetch() }, 1000 * 5)
					return
				}

				rank.contentIsLoading(false)
				rank.render(breakdown, res)
			}, () => {
				rank.contentIsLoading(false)
			})
		}

		rank.contentIsLoading(true)
		fetch()
	}

	rank.render = (breakdown, res) => {
		let data = _.sortBy(res.Data.Data, (d) => toolkit.redefine(d._id[`_id_${toolkit.replace(breakdown, '.', '_')}`], ''))

		let rows = []
		data.forEach((d) => {
			let row = {}
			row.original = d._id[`_id_${toolkit.replace(breakdown, '.', '_')}`]
			row.pnl = d._id[`_id_${toolkit.replace(breakdown, '.', '_')}`]
			if ($.trim(row.pnl) == '') {
				row.original = ''
				row.pnl = ''
			}
			if (breakdown == 'date.month') {
				row.original = (parseInt(row.pnl, 10) - 1)
				row.pnl = moment(new Date(2015, row.original, 1)).format('MMMM')
			}


			row.gmPercentage = toolkit.number(d.PL74C / d.PL8A) * 100
			row.cogsPercentage = toolkit.number(d.PL74B / d.PL8A) * 100
			row.ebitPercentage = toolkit.number(d.PL44B / d.PL8A) * 100
			row.ebitdaPercentage = toolkit.number(d.PL44C / d.PL8A) * 100
			row.anpPercentage = toolkit.number(d.PL32A / d.PL8A) * 100
			row.anp = d.PL32A
			row.ebitdaRoyalties = d.PL44D
			row.netMargin = d.PL74D
			row.netSales = d.PL8A
			row.ebit = d.PL44B
			rows.push(row)
		})

		rank.data(_.orderBy(rows, (d) => {
			return rpt.orderByChannel(d.pnl, d.netSales)
		}, 'desc'))
		rank.columns()[0].title = _.find(rank.optionDimensions(), (e) => { return e.field == rank.breakdown() }).name
		let config = {
			dataSource: {
				data: rank.data(),
				pageSize: 10,
				aggregate: [
					{ field: 'ebitdaRoyalties', aggregate: 'sum' },
					{ field: "netMargin", aggregate: "sum"},
					{ field: "netSales", aggregate: "sum"},
					{ field: "ebit", aggregate: "sum"},
					{ field: "anp", aggregate: "sum"}
				]
			},
			columns: rank.columns(),
			resizabl: false,
			sortable: true, 
			pageable: true,
			filterable: false,
			dataBound: app.gridBoundTooltipster('.grid-ranking')
		}

		$('.grid-ranking').replaceWith('<div class="grid-ranking sortable"></div>')
		$('.grid-ranking').kendoGrid(config)
	}
})()








// ===== JENERATE KOMBINASYON FOR DIS MODUL =====

let MEJIK_FUNC = (() => {
	combinations([
		"date.quartertxt",
		"date.month",

		"customer.reportsubchannel",
		"customer.reportchannel",

		"customer.channelid",

		"customer.region",
		"customer.zone",
		"customer.areaname",
		"customer.branchname",

		"customer.keyaccount",
		"customer.customergroup",
		"customer.customergroupname",

		"product.brand",
	]).map((d) => {
		if (d.indexOf("customer.channelid") > -1) {
			d.push("customer.channelname")
		}

		d.push("date.fiscal")
		return _.orderBy(d).map((e) => `"${e}"`).join(",")
	}).join(" ")

	let thisis = [
		"date_fiscal",
		"date_quartertxt",
		"date_month",

		"customer_reportchannel", // OK
		"customer_reportsubchannel", // OK

		"customer_channelid", // OK
		"customer_channelname", // OK

		"customer_region",
		"customer_zone",
		"customer_areaname",
		"customer_branchname", // OK

		"customer_keyaccount", // OK
		"customer_customergroup", // OK
		"customer_customergroupname", // OK

		"product_brand", // OK
	]
})

vm.currentMenu('P&L Performance')
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: 'P&L Performance', href: '#' }
])

bkd.title('P&L by Channels')
kac.title('&nbsp;')

rpt.refresh = () => {
	$('.tab-pane.active .btn-primary').trigger('click')
}

$(() => {
	rpt.showExport(true)

	subchan.fillOptionFilters()

	toolkit.runAfter(() => {
		bkd.changeBreakdown()
		kac.changeBreakdown()
		kac.changeBreakdownGroup()
		subchan.changeBreakdownBrand()
		subchan.changeBreakdownDistributor()
		subchan.changeBreakdownGeneralTrade()
		subchan.changeBreakdownCity()
		subchan.changeBreakdownBranch()
		subchan.changeBreakdownBranchGroup()
		subchan.changeBreakdownChannelValue()
		dsbrd.changeBreakdown()

		toolkit.runAfter(() => { 
			kac.breakdownValue(['All'])
			kac.breakdownGroupValue(['All'])
			bkd.breakdownValue(['All'])
			subchan.breakdownBrand(['All'])
			subchan.breakdownDistributor(['All'])
			subchan.breakdownGeneralTrade(['All'])
			subchan.breakdownCity(['All'])
			subchan.breakdownBranch(['All'])
			subchan.breakdownBranchGroup(['All'])
			subchan.breakdownChannelValue(['All'])
			dsbrd.breakdownValue(['All'])

			bkd.refresh()
		}, 200)
	}, 300)
})
