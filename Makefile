all: assembler writer challengeprocessor eventmonitor eventprocessor commiter

assembler:
	docker build -f Dockerfile.blockAssembler -t thematterio/blockassembler:assembler -t assembler . 
	docker push thematterio/blockassembler:assembler

writer:
	docker build -f Dockerfile.blockWriter -t thematterio/blockwriter:writer -t writer . 
	docker push thematterio/blockwriter:writer

challengeprocessor:
	docker build -f Dockerfile.challengeProcessor -t thematterio/challengeprocessor:cprocessor -t cprocessor . 
	docker push thematterio/challengeprocessor:cprocessor

eventmonitor:
	docker build -f Dockerfile.eventMonitor -t thematterio/eventmonitor:emonitor -t emonitor . 
	docker push thematterio/eventmonitor:emonitor

eventprocessor:
	docker build -f Dockerfile.eventProcessor -t thematterio/eventprocessor:eprocessor -t eprocessor . 
	docker push thematterio/eventprocessor:eprocessor

commiter:
	docker build -f Dockerfile.headerCommiter -t thematterio/headercommiter:commiter -t commiter . 
	docker push thematterio/headercommiter:commiter