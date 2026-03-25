document.getElementById("exportBtn").onclick = () => {

    if (lastResult.length === 0) {
        alert("Không có dữ liệu để xuất");
        return;
    }

    const rows = lastResult.map(r =>
        r.line.split(/\s{2,}|\t/)
    );

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "TraCuu");

    XLSX.writeFile(wb, "ket-qua-tra-cuu.xlsx");
};
