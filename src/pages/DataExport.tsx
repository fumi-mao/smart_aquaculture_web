import React from 'react';

const DataExport = () => {
  return (
    <div className="flex flex-col h-full bg-white p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">数据导出</h1>
      <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
        <p className="text-gray-500 mb-4">选择需要导出的数据类型和时间范围</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          导出 Excel 报表
        </button>
      </div>
    </div>
  );
};

export default DataExport;
