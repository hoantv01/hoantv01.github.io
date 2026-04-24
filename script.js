let rawData = [];
let currentFile = "dbhc.txt";
let lastResult = [];

const input = document.getElementById("searchInput");
const tbody = document.getElementById("results");
const thead = document.getElementById("table-head");
const tabs = document.querySelectorAll(".tab");

/* =====================
   CHUẨN HÓA TIẾNG VIỆT
===================== */
function normalize(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* =====================
   LOAD FILE (HỖ TRỢ JSON SIÊU TỐC)
===================== */
async function loadFile(file) {
    // Khóa ô tìm kiếm trong tích tắc lúc tải
    input.disabled = true;
    input.value = "";
    input.placeholder = "Đang nạp dữ liệu...";
    tbody.innerHTML = "";
    rawData = [];

    buildHeader(file);

    try {
        // Tự động nhận diện tab ĐVSDNS để gọi file .json
        if (file.includes("madbhcdonvi")) {
            const res = await fetch("data/madbhcdonvi.json");
            if (!res.ok) throw new Error("Không tìm thấy file JSON");
            
            // Lõi C++ của trình duyệt sẽ parse Array of Arrays 300.000 dòng trong ~0.1s
            rawData = await res.json(); 
        } else {
            // Các tab khác vẫn dùng file .txt bình thường
            const res = await fetch("data/" + file);
            if (!res.ok) throw new Error("Không tìm thấy file TXT");
            
            const text = await res.text();
            rawData = text.split(/\r?\n/).filter(x => x.trim());
        }
        
        input.disabled = false;
        input.placeholder = "Nhập từ khóa tìm kiếm...";
        input.focus();
        
    } catch (err) {
        input.placeholder = "Lỗi: Không tải được dữ liệu!";
        console.error(err);
    }
}

loadFile(currentFile);

/* =====================
   HEADER TABLE
===================== */
function buildHeader(file) {
    if (file === "dbhc.txt")
        thead.innerHTML = "<th>Mã</th><th>Phường / Xã</th><th>Tỉnh / Huyện</th>";
    else if (file === "kbnn.txt")
        thead.innerHTML = "<th>Tên Kho bạc</th><th>Mã</th><th>Tỉnh</th>";
    else if (file.includes("madbhcdonvi")) 
        thead.innerHTML = "<th>Mã ĐVSDNS</th><th>Tên đơn vị</th><th>Mã ĐBHC</th>";
    else
        thead.innerHTML = "<th>Mã</th><th>Ngân hàng</th>";
}

/* =====================
   SEARCH DBHC (NGUYÊN BẢN)
===================== */
function searchDBHC(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ");
    let results = [];

    for (let line of rawData) {
        const cols = line.split(/\t| {2,}/);
        const ma = cols[0] || "";
        const ten = cols[1] || "";
        const tinh = cols[2] || "";

        const nTen = normalize(ten);
        const nTinh = normalize(tinh);
        const full = normalize(ten + " " + tinh);

        let score = 0;
        if (nTen === q) score += 1000;
        if (nTen.includes(q)) score += 800;
        if (full.includes(q)) score += 600;

        const tenWords = nTen.split(" ");
        if (keys.length === tenWords.length) {
            const a = [...keys].sort().join(" ");
            const b = [...tenWords].sort().join(" ");
            if (a === b) score += 300;
        }

        keys.forEach(k => {
            if (nTen.includes(k)) score += 80;
            if (nTinh.includes(k)) score += 40;
        });

        if (ma.includes(keyword)) score += 900;
        if (score > 0) results.push({ line, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
}

/* =====================
   SEARCH NGÂN HÀNG & KBNN (NGUYÊN BẢN)
===================== */
function searchNormal(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ").filter(k => k.trim() !== "");
    let results = [];

    for (let line of rawData) {
        const n = normalize(line);
        const isMatchAll = keys.every(k => n.includes(k));
        if (!isMatchAll) continue; 

        let score = 0;
        if (n.includes(q)) score += 1000; 

        keys.forEach(k => {
            const paddedN = " " + n + " ";
            const paddedK = " " + k + " ";
            if (paddedN.includes(paddedK)) score += 50; 
            else score += 20; 
        });
        results.push({ line, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
}

/* =====================
   SEARCH ĐVSDNS (TỐI ƯU HÓA CHO JSON)
===================== */
function searchDVSDNS(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ").filter(k => k.trim() !== "");
    const qLower = keyword.trim().toLowerCase();
    let results = [];

    // rawData lúc này là mảng các mảng: [[ma, ten, madbhc, ten_khong_dau], ...]
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        const ma = (row[0] || "").toLowerCase();
        // Bỏ qua row[1] (tên gốc có dấu) vì không cần dùng để tìm kiếm
        const maDBHC = (row[2] || "").toLowerCase();
        const nTen = row[3] || ""; // Đã được Python cắt dấu sẵn

        // 1. Kiểm tra bắt buộc
        const isMatchAll = keys.every(k => 
            ma.includes(k) || 
            nTen.includes(k) || 
            maDBHC.includes(k)
        );
        
        if (!isMatchAll) continue;

        // 2. Tính điểm
        let score = 0;

        if (ma === qLower) score += 2000;
        else if (ma.includes(qLower)) score += 900;
        
        if (maDBHC === qLower) score += 1500;
        else if (maDBHC.includes(qLower)) score += 700;

        if (nTen === q) score += 1000;        
        if (nTen.includes(q)) score += 800;   

        keys.forEach(k => {
            const paddedN = " " + nTen + " ";
            const paddedK = " " + k + " ";
            if (paddedN.includes(paddedK)) score += 50; 
            else if (nTen.includes(k)) score += 20;      
        });

        if (score > 0) {
            // Nối lại thành chuỗi line để dùng chung logic Render với các Tab khác
            const line = `${row[0]}\t${row[1]}\t${row[2]}`;
            results.push({ line, score });
        }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
}

/* =====================
   SỰ KIỆN TÌM KIẾM & RENDER
===================== */
input.addEventListener("input", () => {
    tbody.innerHTML = "";
    lastResult = [];

    const keyword = input.value.trim();
    if (!keyword) return;

    let results = [];

    if (currentFile === "dbhc.txt") {
        results = searchDBHC(keyword);
    } else if (currentFile.includes("madbhcdonvi")) {
        results = searchDVSDNS(keyword); 
    } else {
        results = searchNormal(keyword);
    }

    lastResult = results;
    
    // Tách từ khóa gốc để highlight đúng cả trường hợp có dấu và không dấu
    const highlightKeys = keyword.split(" ").filter(k => k.trim() !== "");

    results.forEach(obj => {
        const cols = obj.line.split(/\t| {2,}/);
        const tr = document.createElement("tr");

        cols.forEach(col => {
            let html = col;
            highlightKeys.forEach(k => {
                if (k.length > 0) {
                    const safeK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const reg = new RegExp(`(${safeK})`, "gi");
                    html = html.replace(reg, "<mark>$1</mark>");
                }
            });

            const td = document.createElement("td");
            td.innerHTML = html;
            tr.appendChild(td);
        });

        // Click để copy mã
        tr.onclick = () => {
            navigator.clipboard.writeText(cols[0])
                .then(() => alert("Đã copy: " + cols[0]))
                .catch(err => console.error("Lỗi copy: ", err));
        };
        tr.style.cursor = "pointer";
        
        tbody.appendChild(tr);
    });
});

/* =====================
   SỰ KIỆN CHUYỂN TAB
===================== */
tabs.forEach(tab => {
    tab.onclick = () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentFile = tab.dataset.file.trim(); 
        loadFile(currentFile);
    };
});
