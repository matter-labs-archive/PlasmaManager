assembler:
	docker build -f Dockerfile.blockAssembler -t thematterio/blockassembler:assembler -t assembler . 
	docker push thematterio/blockassembler:assembler

writer:
	docker build -f Dockerfile.blockWriter -t thematterio/blockwriter:writer -t writer . 
	docker push thematterio/blockwriter:writer

commiter:
	docker build -f Dockerfile.headerCommiter -t thematterio/headercommiter:commiter -t commiter . 
	docker push thematterio/headercommiter:commiter