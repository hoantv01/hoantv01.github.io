/* =========================================
   CÁC BIẾN TOÀN CỤC & TRẠNG THÁI HỆ THỐNG
========================================= */
let rawData = [];
let parsedDVSDNS = []; 
let currentFile = "dbhc.txt";
let lastResult = [];

// Trạng thái tải ngầm cho file dung lượng lớn
let isDVSDNSReady = false;
let isDVSDNSLoading = false;

// Các phần tử DOM
const input = document.getElementById("searchInput");
const tbody = document.getElementById("results");
const thead = document.getElementById("table-head");
const tabs = document.querySelectorAll(".tab");

/* =========================================
   1. HÀM CHUẨN HÓA TIẾNG VIỆT (TỐI ƯU)
========================================= */
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

/* =========================================
   2. TẢI NGẦM DỮ LIỆU ĐVSDNS (>400K DÒNG)
========================================= */
function preloadDVSDNS() {
    if (isDVSDNSLoading || isDVSDNSReady) return;
    isDVSDNSLoading = true;

    // Sử dụng PapaParse đọc ngầm file thông qua Web Worker
    Papa.parse("data/madbhcdonvi.txt", {
        download: true,
        delimiter: "\t",
        worker: true, // Không làm treo giao diện trình duyệt
        skipEmptyLines: true,
        complete: function(results) {
            // Tiền xử lý: Chỉ chuẩn hóa tên 1 lần duy nhất để tìm kiếm siêu tốc
            parsedDVSDNS = results.data.map(cols => {
                const ma = cols[0] ? cols[0].trim().toLowerCase() : "";
                const ten = cols[1] ? cols[1].trim() : "";
                const maDBHC = cols[2] ? cols[2].trim().toLowerCase() : "";
                
                return {
                    ma: ma,                 // Mã số không cần cắt dấu tiếng Việt
                    maDBHC: maDBHC,         // Mã ĐBHC không cần cắt dấu tiếng Việt
                    nTen: normalize(ten),   // Chỉ chuẩn hóa cột Tên
                    originalLine: `${cols[0] || ""}\t${cols[1] || ""}\t${cols[2] || ""}`
                };
            });

            isDVSDNSReady = true;
            
            // Nếu người dùng đang đứng ở tab ĐVSDNS và đang đợi, mở khóa input ngay
            if (currentFile === "madbhcdonvi.txt") {
                input.disabled = false;
                input.placeholder = "Nhập Mã hoặc Tên ĐVSDNS để tra cứu...";
                input.focus();
            }
        },
        error: function(err) {
            console.error("Lỗi tải ngầm ĐVSDNS:", err);
            if (currentFile === "madbhcdonvi.txt") {
                input.placeholder = "Lỗi tải dữ liệu. Vui lòng tải lại trang (F5).";
            }
        }
    });
}

// KÍCH HOẠT TẢI NGẦM NGAY KHI VỪA MỞ TRANG WEB
preloadDVSDNS();

/* =========================================
   3. XỬ LÝ CHUYỂN TAB VÀ TẢI FILE NHỎ
========================================= */
async function loadFile(file) {
    input.value = "";
    tbody.innerHTML = "";
    rawData = [];

    buildHeader(file);

    if (file === "madbhcdonvi.txt") {
        if (isDVSDNSReady) {
            // Đã tải ngầm xong -> Dùng được luôn
            input.disabled = false;
            input.placeholder = "Nhập Mã hoặc Tên ĐVSDNS để tra cứu...";
            input.focus();
        } else {
            // Mạng chậm, chưa tải ngầm xong -> Khóa input bắt đợi
            input.disabled = true;
            input.placeholder = "Hệ thống đang nạp danh mục ĐVSDNS, vui lòng đợi vài giây...";
        }
    } else {
        // Xử lý các file txt nhỏ (dbhc, kbnn...)
        input.disabled = false;
        input.placeholder = "Nhập từ khóa tìm kiếm...";
        try {
            const res = await fetch("data/" + file);
            if (!res.ok) throw new Error("Không tìm thấy file");
            const text = await res.text();
            rawData = text.split(/\r?\n/).filter(x => x.trim());
        } catch (err) {
            input.placeholder = "Lỗi: Không tìm thấy file " + file;
        }
    }
}

// Nạp file mặc định ban đầu
loadFile(currentFile);

/* =========================================
   4. RENDER HEADER BẢNG KẾT QUẢ
========================================= */
function buildHeader(file) {
    if (file === "dbhc.txt")
        thead.innerHTML = "<th>Mã</th><th>Phường / Xã</th><th>Tỉnh / Huyện</th>";
    else if (file === "kbnn.txt")
        thead.innerHTML = "<th>Tên Kho bạc</th><th>Mã</th><th>Tỉnh</th>";
    else if (file === "madbhcdonvi.txt") 
        thead.innerHTML = "<th>Mã ĐVSDNS</th><th>Tên đơn vị</th><th>Mã ĐBHC</th>";
    else
        thead.innerHTML = "<th>Mã</th><th>Ngân hàng</th>";
}

/* =========================================
   5. CÁC HÀM TRA CỨU
========================================= */

// Tra cứu Địa bàn hành chính
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

// Tra cứu KBNN & Ngân hàng
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

// Tra cứu ĐVSDNS (ĐÃ TỐI ƯU CHO 400.000 DÒNG)
function searchDVSDNS(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ").filter(k => k.trim() !== "");
    const qLower = keyword.trim().toLowerCase();
    let results = [];

    // Duyệt qua mảng object đã được tiền xử lý ngầm ở bước 2
    for (let i = 0; i < parsedDVSDNS.length; i++) {
        const item = parsedDVSDNS[i];

        const isMatchAll = keys.every(k => 
            item.ma.includes(k) || 
            item.nTen.includes(k) || 
            item.maDBHC.includes(k)
        );
        
        if (!isMatchAll) continue;

        let score = 0;

        if (item.ma === qLower) score += 2000;
        else if (item.ma.includes(qLower)) score += 900;
        
        if (item.maDBHC === qLower) score += 1500;
        else if (item.maDBHC.includes(qLower)) score += 700;

        if (item.nTen === q) score += 1000;        
        if (item.nTen.includes(q)) score += 800;   

        keys.forEach(k => {
            const paddedN = " " + item.nTen + " ";
            const paddedK = " " + k + " ";
            if (paddedN.includes(paddedK)) score += 50; 
            else if (item.nTen.includes(k)) score += 20;      
        });

        if (score > 0) {
            results.push({ line: item.originalLine, score: score });
        }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
}

/* =========================================
   6. LẮNG NGHE SỰ KIỆN TÌM KIẾM VÀ RENDER
========================================= */
input.addEventListener("input", () => {
    tbody.innerHTML = "";
    lastResult = [];

    const keyword = input.value.trim();
    if (!keyword) return;

    let results = [];

    if (currentFile === "dbhc.txt") {
        results = searchDBHC(keyword);
    } else if (currentFile === "madbhcdonvi.txt") {
        results = searchDVSDNS(keyword); 
    } else {
        results = searchNormal(keyword);
    }

    lastResult = results;
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

        // Click vào dòng để copy mã cột đầu tiên
        tr.onclick = () => {
            navigator.clipboard.writeText(cols[0])
                .then(() => alert("Đã copy mã: " + cols[0]))
                .catch(err => console.error("Lỗi copy: ", err));
        };

        // Hiệu ứng thay đổi con trỏ chuột khi hover
        tr.style.cursor = "pointer";
        
        tbody.appendChild(tr);
    });
});

/* =========================================
   7. SỰ KIỆN CHUYỂN TAB
========================================= */
tabs.forEach(tab => {
    tab.onclick = () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        // .trim() để ngăn ngừa lỗi gõ dư khoảng trắng trong HTML (data-file)
        currentFile = tab.dataset.file.trim(); 
        loadFile(currentFile);
    };
});
