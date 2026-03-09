import * as odbc from 'odbc';

export class Connection {

    private dataSources = [
        {
            name: 'MySQL',
            connection: null
        }
    ];

    getDataSources() {
        return this.dataSources.map(dataSource => dataSource.name);
    }

    getConnection(dataSourceName: string) {
        return this.dataSources.find(dataSource => dataSource.name === dataSourceName)?.connection;
    }
}