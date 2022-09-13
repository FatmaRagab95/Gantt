import taskData from './data.js';
const data  = taskData.data;
const links = taskData.links;
class gantt {
    constructor(data, links) {
        this.data  = data;
        this.links = links;
        this.dataGantt = [];
        this.ganttDates = [];
        this.ganttSettings = {
            parentField:"parent",
            startField: "start_date",
            endField: "end_date",
            nameField: "text",
            progressField:"progress",
            indentSpace: 10,
            pathColor:'#ffa011'
        };
        // gantts elements
        this.el                       = document.getElementById('gantt');
        this.gantt_layout_root        = document.createElement('div');
        this.gantt_layout_infocell    = document.createElement('div');
        this.gantt_layout_infoHeaders = document.createElement('div');
        this.gantt_layout_ganttcell   = document.createElement('div');
        this.gantt_layout_ganttDates  = document.createElement('div');
        this.svg                      = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        
        this.head     = document.createElement('div');
        this.infoHead = document.createElement('div');
        this.datesHead = document.createElement('div');
        this.container = document.createElement('div');
        
        return this.prepareData();
    }

    prepareData() {
        const that = this;
        const set  = that.ganttSettings;
        let dataGT = Object.assign([], that.data);

        dataGT = dataGT.sort((a,b) => (new Date(a[set.startField]).getTime()) - (new Date(b[set.startField]).getTime()));
    
        for (let i = 0; i < dataGT.length; i++) {
            let children = dataGT.filter(x => x[set.parentField] == dataGT[i].id).length > 0 ?
            dataGT.filter(x => x[set.parentField] == dataGT[i].id) : null;
            
            dataGT[i].children = children;
            dataGT[i]._children = null;
            
            // if (i > 1) {
            //     dataGT[i].children = null;
            //     dataGT[i]._children = children;
            // }
            dataGT[i].key = that.generateKey(dataGT[i], dataGT);
        }
        if (dataGT.length) {
            that.dataGantt = dataGT.filter(x => !x[set.parentField] || x[set.parentField] == 0);
            that.ganttLayout();
            that.implementingData(that.dataGantt).then(() => {
                that.generateLinks();
            });
        }
    }
    generateKey(obj , arr) {
        const set = this.ganttSettings;
        let parent = arr.filter(x => x.id == obj[set.parentField]);
        
        if (parent.length && parent[0].key) {
            return parent[0].key + ':' + obj.id
        } else if (parent.length) {
            return this.generateKey(parent[0], arr) + ':' + obj.id;
        } else {
            return (obj.id).toString()
        }
    }
    async implementingData(data) {
        const that = this;
        for (let i = 0; i < data.length; i++) {
            const obj = data[i];
            that.infoCellRow(obj);
            that.ganttCellRow(obj);
            if (obj.children) {
                that.implementingData(obj.children);
            }
        }
        
    }

    ganttLayout() {
        this.infoHead.classList.add('gantt_layout_cell', 'gantt_head_info');
        this.datesHead.classList.add('gantt_layout_cell', 'gantt_head_dates');
        this.container.classList.add('gantt_container');
        this.gantt_layout_root.classList.add('gantt_layout_root');
        this.gantt_layout_infocell.classList.add('gantt_layout_cell');
        this.gantt_layout_ganttcell.classList.add('gantt_layout_cell');
        this.el.appendChild(this.container);
        this.container.appendChild(this.gantt_layout_root);
        this.gantt_layout_infoHeaders.classList.add('gantt_cell_row');
        this.gantt_layout_ganttDates.classList.add('gantt_cell_row');
        this.head.classList.add('gantt_layout_root');
        // info headers
        this.gantt_layout_infoHeaders.innerHTML = `
                <span class='gantt-header'>Name</span>
                <span class='gantt-header'>Start Date</span>
        `;
        this.head.appendChild(this.infoHead);
        this.infoHead.appendChild(this.gantt_layout_infoHeaders);
        this.head.appendChild(this.datesHead);
        this.datesHead.appendChild(this.gantt_layout_ganttDates);
        this.gantt_layout_root.appendChild(this.gantt_layout_infocell);
        this.gantt_layout_root.appendChild(this.gantt_layout_ganttcell);
        this.el.prepend(this.head);
        this.gantt_layout_ganttcell.appendChild(this.svg);
        this.svg.classList.add('gantt_svg');

        // generate gantt dates
        this.generateGanttDates();
    }
    infoCellRow(obj) {
        const that = this;
        const set = that.ganttSettings;
        const name = obj[set.nameField];
        const start = obj[set.startField];
        const infoRow = document.createElement('div');
        infoRow.classList.add('gantt_cell_row');
        const indentNum = obj.key.split(":").length - 1;
        let indentHtml = '';

        for (let i = 0; i < indentNum; i++) {
            indentHtml += `<span class='gantt-indent' style='width:${set.indentSpace}px'></span>`
        }
        infoRow.innerHTML += `
        <div class='gantt-info'>
            ${indentHtml}
            
            <i data-feather="${obj.children ? 'folder-minus' : obj._children ? 'folder-plus' : 'file'}"></i>
            <span>${name}</span>
        </div>
        <span class='gantt-info'>
            ${start.substring(0,10)}
        </span>`

        this.gantt_layout_infocell.appendChild(infoRow);
    }
    ganttCellRow(obj) {
        const that         = this;
        const set          = that.ganttSettings;
        const name         = obj[set.nameField];
        const start        = obj[set.startField];
        const end          = obj[set.endField];
        const progress     = obj[set.progressField];
        const gantt_row    = document.createElement('div');
        const gantt_bar    = document.createElement('div');
        const bar_name     = document.createElement('div');
        const bar_progress = document.createElement('span');
        const state        = obj.children || obj._children ? 'withChildren' : 'noChildren';
        const startIndex   = (this.ganttDates.indexOf(new Date(start).getTime()));
        const endIndex     = (this.ganttDates.indexOf(new Date(end).getTime())) + 2;
        const leftPos      = (100 / this.ganttDates.length) * (startIndex + 1);
        const width        = ((100 / this.ganttDates.length) * endIndex) - leftPos;
    
        // appending elements
        this.gantt_layout_ganttcell.appendChild(gantt_row);
        gantt_row.appendChild(gantt_bar);
        gantt_bar.appendChild(bar_name);
        gantt_bar.appendChild(bar_progress);

        // attrs of gantt row
        gantt_row.classList.add('gantt_cell_row', 'gantt_row');
        gantt_row.setAttribute("data-row-id", obj.id);

        // attrs of gantt bar
        gantt_bar.classList.add('gantt_bar', state);
        gantt_bar.style.left  = `${leftPos}%`;
        gantt_bar.style.width = `${width}%`;

        // attrs of gantt bar name
        bar_name.classList.add('bar_name');

        // attrs of gantt bar progress
        bar_progress.classList.add('bar_progress');
        bar_progress.style.width = `${progress}%`;

        bar_name.innerHTML += `
            <span>${name}</span>
        `;

        // appending elements
        gantt_bar.appendChild(bar_name);
        gantt_bar.appendChild(bar_progress);

        this.dragBars();
    }
    generateGanttDates() {
        const that = this;
        const set  = that.ganttSettings;
        const startInMillSec = this.data.map(x => (new Date(x[set.startField])).getTime());
        const endInMillSec   = this.data.map(x => (new Date(x[set.endField])).getTime());
        const day       = 1000 * 60 * 60 * 24;
        const minDate   = Math.min(...startInMillSec);
        const maxDate   = Math.max(...endInMillSec) + (day * 2);
        const widthInfo = 400;
        this.ganttDates = [];

        this.gantt_layout_ganttDates.innerHTML = "";

        for (let i = minDate; i <= maxDate; i = i + day) {
            this.ganttDates.push(new Date(i).getTime());

            this.gantt_layout_ganttDates.innerHTML += `
                <span class='gantt-date' data-date='${new Date(i).toJSON()}'>${new Date(i).toJSON().substring(5,10)}</span>
            `
        }

        this.infoHead.style.minWidth = widthInfo + 'px';
        this.gantt_layout_ganttcell.style.minWidth = this.ganttDates.length * 80 + 'px';
        this.datesHead.style.minWidth = this.ganttDates.length * 80 + 'px';
        this.container.style.minWidth = ((this.ganttDates.length * 80) + widthInfo) + 'px';
    }

    generateLinks () {
        const that = this;
        const set  = that.ganttSettings;

        // independency links
        for (let i = 0; i < that.links.length; i++) {
            const obj         = that.links[i];
            const el          = document.querySelector(`#gantt .gantt_row[data-row-id='${obj.target}']`);
            const elBar       = document.querySelector(`#gantt .gantt_row[data-row-id='${obj.target}'] .gantt_bar`);
            const parent      = document.querySelector(`#gantt .gantt_row[data-row-id='${obj.source}']`);
            const parentBar   = document.querySelector(`#gantt .gantt_row[data-row-id='${obj.source}'] .gantt_bar`);
            const pos         = true;
            const linkStartX  = pos ? parentBar.offsetLeft + parentBar.offsetWidth : parentBar.offsetLeft;
            const linkEndX    = pos ? elBar.offsetLeft - 5 : elBar.offsetLeft;
            const linkStartY  = parent.offsetTop - (parent.offsetHeight / 2) - 9;
            const linkEndY    = el.offsetTop - (el.offsetHeight / 2) - 9;

            that.svg.innerHTML += `
                <path 
                    stroke="${set.pathColor}" stroke-width="2"
                    fill='rgba(0,0,0,0)'
                    d="
                    M ${linkStartX}, ${linkStartY} 
                    L ${linkStartX + 15}, ${linkStartY} 
                    L ${linkStartX + 15}, ${linkStartY + 20} 
                    L ${linkEndX - 15}, ${linkStartY + 20} 
                    L ${linkEndX - 15}, ${linkEndY}
                    L ${linkEndX - 3}, ${linkEndY}
                "/>
                <path 
                    stroke="${set.pathColor}" stroke-width="2"
                    fill='${set.pathColor}'
                    d="
                    M ${linkEndX - 3}, ${linkEndY - 3}
                    L ${linkEndX + 3}, ${linkEndY}
                    L ${linkEndX - 3}, ${linkEndY + 3}"/>
            `
            ;

        }
    }

    dragBars() {
        const that = this;
        const set  = that.ganttSettings;
        const bars = document.querySelectorAll("#gantt .gantt_row .gantt_bar");

        bars.forEach(bar => {
            let isMouseDown = false;

            bar.addEventListener('mousedown', function(e) {
                e.preventDefault();
                isMouseDown = true;
            });

            document.addEventListener('mousemove', function(ev) {
                ev.preventDefault();
                if (isMouseDown && bar.classList.contains('noChildren')) {
                    const ele = document.querySelector('#gantt .gantt-date');
                    const offset = ele ? ele.getBoundingClientRect() : null;
                    const x = ev.pageX;
                    const y = offset ? offset.top : 0;
                    const el = document.elementFromPoint(x, y);
                    if (el) {
                        const rowId = bar.parentElement.getAttribute('data-row-id');
                        let getTime    = el.getAttribute('data-date') ? new Date(el.getAttribute('data-date')).getTime() : 0;
                        let startIndex = that.ganttDates.indexOf(getTime);
                        let leftPos    = (100 / that.ganttDates.length) * (startIndex + 1);

                        bar.style.left  = `${leftPos}%`;
                        let obj = data.filter(x => x.id == rowId);
                        if (obj.length) {
                            let duration = new Date(obj[0][set.endField]).getTime() -  new Date(obj[0][set.startField]).getTime();
                            obj[0][set.startField] = el.getAttribute('data-date');
                            obj[0][set.endField] = new Date(getTime + duration).toJSON();

                            that.adjustDateParent(obj[0]).then(() => {
                                that.adjustDateDependency(obj[0]).then(() => {
                                    setTimeout(() => {
                                        that.svg.innerHTML = '';
                                        that.generateLinks();
                                    }, 1);
                                });
                            });
                        }
                    }
                }
            });

            document.addEventListener('mouseup', function() {
                isMouseDown = false;
            })
        });
    }

    async adjustDateParent(obj) {
        const that = this;
        const set  = that.ganttSettings;
        let parents = this.data.filter(x => x.id == obj[set.parentField]);
        for (let i = 0; i < parents.length; i++) {
            const start = new Date(parents[i][set.startField]).getTime() > new Date(obj[set.startField]).getTime() ? obj[set.startField] : parents[i][set.startField];
            const end   = new Date(parents[i][set.endField]).getTime() < new Date(obj[set.endField]).getTime() ? obj[set.endField] : parents[i][set.endField];
            const startIndex   = (that.ganttDates.indexOf(new Date(start).getTime()));
            const endIndex     = (that.ganttDates.indexOf(new Date(end).getTime())) + 2;
            const leftPos      = (100 / that.ganttDates.length) * (startIndex + 1);
            const width        = ((100 / that.ganttDates.length) * endIndex) - leftPos;
            const el           = document.querySelector(`div[data-row-id="${parents[i].id}"] .gantt_bar`);

            parents[i][set.startField] = start;
            parents[i][set.endField] = end;

            if (el) {
                el.style.left  = `${leftPos}%`;
                el.style.width = `${width}%`;
            }

            if (parents[i][set.parentField]) {
                that.adjustDateParent(parents[i]);
            }
        }
    }
    async adjustDateDependency(obj) {
        const that = this;
        const set  = that.ganttSettings;
        let dependencies = this.links.filter(x => x.source == obj.id);
        for (let i = 0; i < dependencies.length; i++) {
            const dependencyObj = that.data.filter(x => x.id == dependencies[i].target);

            if (dependencyObj.length) {
                const day       = 1000 * 60 * 60 * 24;
                const linked = dependencyObj[0];
                const duration     = new Date(linked[set.endField]).getTime() -  new Date(linked[set.startField]).getTime();
                const start = new Date(linked[set.startField]).getTime() < new Date(obj[set.endField]).getTime() ?
                new Date(new Date(obj[set.endField]).getTime() + (day)).toJSON():
                 linked[set.startField];
                const end   = new Date(new Date(start) + duration).toJSON();
                const startIndex   = (that.ganttDates.indexOf(new Date(start).getTime()));
                const endIndex     = (that.ganttDates.indexOf(new Date(end).getTime())) + 2;
                const leftPos      = (100 / that.ganttDates.length) * (startIndex + 1);
                const width        = ((100 / that.ganttDates.length) * endIndex) - leftPos;
                const el           = document.querySelector(`div[data-row-id="${linked.id}"] .gantt_bar`);

                linked[set.startField] = start;
                linked[set.endField] = end;

                if (el) {
                    el.style.left  = `${leftPos}%`;
                    el.style.width = `${width}%`;
                }
    
                if (linked[set.parentField]) {
                    that.adjustDateDependency(linked);
                }
            }
        }
    }
}

const Gantt = new gantt(data, links);
feather.replace();