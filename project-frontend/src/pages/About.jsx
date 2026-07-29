export default function About() {
  return (
    <div>
      {/* PAGE HEADER */}
      <section className="bg-gradient-to-br from-primary to-primary-light text-white py-16 text-center">
        <div className="container mx-auto px-4 max-w-7xl">
          <h1 className="text-4xl font-bold mb-3">Giới Thiệu Về CK Tea</h1>
          <p className="text-lg opacity-90">Hành trình từ vườn trà đến ly trà của bạn</p>
        </div>
      </section>

      {/* ABOUT CONTENT */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="overflow-hidden rounded-xl shadow-lg">
              <img 
                src="/img/about.jpg" 
                alt="Vườn trà" 
                className="w-full h-[350px] object-cover hover:scale-105 transition duration-500"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-dark mb-6">Nguồn Gốc Tự Nhiên</h2>
              <p className="text-light mb-4 leading-relaxed">
                CK Tea được thành lập với mục tiêu mang đến những sản phẩm trà sấy khô chất lượng cao, giữ nguyên hương vị và dưỡng chất tự nhiên.
              </p>
              <p className="text-light mb-4 leading-relaxed">
                Tất cả các sản phẩm được lựa chọn kỹ lưỡng từ những vườn trà tươi tốt nhất, sấy khô bằng phương pháp hiện đại kết hợp truyền thống để đảm bảo chất lượng tối ưu khi đến tay khách hàng.
              </p>
              <p className="text-light leading-relaxed">
                Chúng tôi tin rằng trà là một phần không thể thiếu trong cuộc sống hàng ngày, mang lại sức khỏe, sự thư giãn và kết nối mọi người lại với nhau.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES SECTION */}
      <section className="bg-bglight py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-3xl font-bold text-center text-dark mb-12">Giá Trị Cốt Lõi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center hover:shadow-md transition transform hover:-translate-y-2">
              <div className="text-4xl text-primary mb-4">
                <i className="fas fa-leaf"></i>
              </div>
              <h3 className="text-lg font-bold mb-3">100% Hữu Cơ</h3>
              <p className="text-light text-sm leading-relaxed">Trà được trồng và chăm sóc không sử dụng hóa chất độc hại, giữ nguyên tinh túy từ đất trời.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm text-center hover:shadow-md transition transform hover:-translate-y-2">
              <div className="text-4xl text-primary mb-4">
                <i className="fas fa-hand-holding-heart"></i>
              </div>
              <h3 className="text-lg font-bold mb-3">Tận Tâm Chăm Sóc</h3>
              <p className="text-light text-sm leading-relaxed">Từ khâu thu hoạch đến đóng gói đều được thực hiện tỉ mỉ, chứa đựng trọn vẹn tâm huyết.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm text-center hover:shadow-md transition transform hover:-translate-y-2">
              <div className="text-4xl text-primary mb-4">
                <i className="fas fa-recycle"></i>
              </div>
              <h3 className="text-lg font-bold mb-3">Bảo Vệ Môi Trường</h3>
              <p className="text-light text-sm leading-relaxed">Cam kết sử dụng bao bì thân thiện với môi trường và hướng tới sự phát triển bền vững.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM SECTION */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-3xl font-bold text-center text-dark mb-12">Đội Ngũ Chúng Tôi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="overflow-hidden rounded-xl mb-4 h-72">
                <img src="/img/founder.jpg" alt="Hoàng Hà Thiện Nhân" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-300" />
              </div>
              <h3 className="text-xl font-bold text-dark">Hoàng Hà Thiện Nhân</h3>
              <p className="text-primary font-semibold text-sm mb-2">Người Sáng Lập</p>
              <p className="text-light text-sm px-4">Với kinh nghiệm dày dặn trong ngành nông sản, định hướng CK Tea phát triển bền vững.</p>
            </div>

            <div className="text-center group">
              <div className="overflow-hidden rounded-xl mb-4 h-72">
                <img src="/img/founder.jpg" alt="Trần Thị A" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-300" />
              </div>
              <h3 className="text-xl font-bold text-dark">Trần Thị A</h3>
              <p className="text-primary font-semibold text-sm mb-2">Chuyên Gia Trà</p>
              <p className="text-light text-sm px-4">Đảm bảo mỗi mẻ trà xuất kho đều đạt tiêu chuẩn chất lượng cao nhất về hương và vị.</p>
            </div>

            <div className="text-center group">
              <div className="overflow-hidden rounded-xl mb-4 h-72">
                <img src="/img/founder.jpg" alt="Lê Văn B" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-300" />
              </div>
              <h3 className="text-xl font-bold text-dark">Lê Văn B</h3>
              <p className="text-primary font-semibold text-sm mb-2">Quản Lý Vận Hành</p>
              <p className="text-light text-sm px-4">Kết nối sản phẩm từ nhà xưởng đến tận tay khách hàng một cách tối ưu nhất.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}