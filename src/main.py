"""Sebastian 애플리케이션 엔트리 포인트"""
import sys
from PyQt6.QtWidgets import QApplication
from src.main_window import MainWindow


def main():
    """메인 함수"""
    app = QApplication(sys.argv)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
