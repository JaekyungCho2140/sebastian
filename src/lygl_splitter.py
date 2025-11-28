"""LY/GL 테이블 분할"""
import os
import pandas as pd
from src.excel_formatter import ExcelFormatter


class LYGLSplitter:
    """LY/GL 통합 파일을 7개 언어별 파일로 분할하는 클래스"""

    # PRD 5.2.3: 언어 코드 목록 (7개)
    LANGUAGE_CODES = ["EN", "CT", "CS", "JA", "TH", "PT-BR", "RU"]

    # PRD 5.2.3: 개별 파일 헤더
    OUTPUT_COLUMNS = ["Table", "KEY", "Source", "Target", "Status", "NOTE"]

    def __init__(self):
        """LYGLSplitter 초기화"""
        self.formatter = ExcelFormatter()

    def _extract_language_data(self, merged_df, lang_code):
        """병합 파일에서 특정 언어의 데이터 추출

        Args:
            merged_df: 병합 DataFrame
            lang_code: 언어 코드

        Returns:
            DataFrame: 언어별 데이터
        """
        # PRD 5.1.7: 열 매핑
        lang_df = pd.DataFrame()
        lang_df["Table"] = merged_df["Table"]  # 병합 파일 열 0
        lang_df["KEY"] = merged_df["KEY"]  # 병합 파일 열 1
        lang_df["Source"] = merged_df["Source"]  # 병합 파일 열 2
        lang_df["Target"] = merged_df[f"Target_{lang_code}"]  # 병합 파일 열 3~9
        lang_df["Status"] = merged_df["Status"]  # 병합 파일 열 10
        lang_df["NOTE"] = merged_df["NOTE"]  # 병합 파일 열 11

        # NaN 값 빈 문자열로 변환
        lang_df = lang_df.fillna("")

        return lang_df

    def _save_language_file(self, lang_df, output_path):
        """언어별 파일 저장 및 서식 적용

        Args:
            lang_df: 언어별 DataFrame
            output_path: 출력 파일 경로
        """
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            lang_df.to_excel(writer, index=False, sheet_name="Sheet1", na_rep="")
            ws = writer.sheets["Sheet1"]

            # 빈 문자열 셀을 명시적으로 빈 문자열로 설정
            for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
                for cell in row:
                    if cell.value is None:
                        cell.value = ""

            # 서식 적용
            self.formatter.apply_header_format(ws)
            self.formatter.apply_data_format(ws)
            self.formatter.freeze_panes(ws)

    def split_lygl(self, merged_file_path, output_folder, date_prefix=None):
        """LY/GL 통합 파일을 7개 언어별 파일로 분할

        Args:
            merged_file_path: 병합 파일 경로
            output_folder: 분할 파일 저장 폴더
            date_prefix: 파일명 날짜 접두사 (선택적, 기본값: 입력 파일에서 추출)

        Returns:
            dict: 분할 결과 (success, output_files)
        """
        try:
            # PRD 5.1.7: 병합 파일 읽기
            merged_df = pd.read_excel(merged_file_path, header=0)

            # PRD 5.2.2: 날짜 접두사 추출 (선택적)
            if date_prefix is None:
                # 입력 파일명에서 추출
                filename = os.path.basename(merged_file_path)
                # {date}_StringALL.xlsx 형식에서 날짜 추출
                date_prefix = filename.split("_")[0]

            # PRD 5.1.7: 각 언어별 파일 생성
            output_files = []

            for lang_code in self.LANGUAGE_CODES:
                # 언어별 데이터 추출 (리팩토링: 별도 메서드)
                lang_df = self._extract_language_data(merged_df, lang_code)

                # PRD 5.2.3: 출력 파일명 생성
                output_filename = f"{date_prefix}_{lang_code}.xlsx"
                output_path = os.path.join(output_folder, output_filename)

                # Excel 저장 및 서식 적용 (리팩토링: 별도 메서드)
                self._save_language_file(lang_df, output_path)

                output_files.append(output_path)

            return {
                "success": True,
                "output_files": output_files
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
