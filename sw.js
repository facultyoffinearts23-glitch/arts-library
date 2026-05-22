function loadBooks() {
    var tx = db.transaction("booksStore", "readonly");
    tx.objectStore("booksStore").getAll().onsuccess = function(e) {
        var dynamicBooks = e.target.result;
        // دمج المراجع الأساسية (الـ JSON المدمج) مع الملفات الديناميكية المرفوعة محلياً
        books = [...staticMetadata, ...dynamicBooks].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        renderCards(); 
        updateStats();
    };
}