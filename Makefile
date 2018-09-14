assembler:
	IMAGE = thematterio/blockAssembler
	docker build -f Dockerfile.blockAssembler . -t $(IMAGE) -t assembler
	docker push $(IMAGE)

writer:
	IMAGE = thematterio/
	docker build -f Dockerfile.blockWriter . -t $(IMAGE) -t assembler
	docker push $(IMAGE)